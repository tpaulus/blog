---
title: Weaving a New Solution to Container Networking
slug: weaving-a-new-solution-to-container-networking
date: 2023-05-19T19:48:40.000Z
lastmod: 2026-05-13T19:04:23.000Z
draft: false
status: published
tag:
  - Software
feature_image: https://unsplash.com/photos/a-close-up-of-a-pile-of-woven-material-xsmtEGcaN4U
featured: false
ghost_id: 6436d3a65471910001638a50
ghost_uuid: 47cf8437-c70a-49a8-a6b8-58bb0c5b9d82
url: /weaving-a-new-solution-to-container-networking/
---

As I described in [my recent post setting up Nomad](blog.tompaulus.com/resilient-homelab-infrastructure/ ), I restored to using `macvlan` to get containers their own network addresses, but this had the unfortunate side effect of container being unable to talk to their host due to intricacies of how the Linux kernel does packet routing. I wasn't happy with the solution, both because containers would sometimes get stuck and not get cleaned up, resulting in more than one container with the same IP address running on the network, leading to all sorts of strange issues; and because it meant that there was a single point of failure in my router, serving both Consul DNS and hosting cloudflared for the applications which used `macvlan`. So I went looking for options.

## Looking for a Solution

I was weary of CNIs and their support in Nomad from the many hours I spent cursing the last time I tried to deal with this issue, so I was looking for solutions that had already been successfully integrated with Nomad in the past. I landed on three options: Calico, Flannel, and Weave, thanks to [a post by SUSE's Rancher project](https://www.suse.com/c/rancher_blog/comparing-kubernetes-cni-providers-flannel-calico-canal-and-weave/). Each had their upsides and downsides.

**Calico** - We use this at work, so I am somewhat familiar with its operations, but the use of BGP would cause issues as my router, a Unifi Dream Machine Pro, doesn't support BGP out of the box. It also had a bunch of enterprise features, like network policies, I do not need, so I kept looking.

**Flannel** - This seemed like a great option, until I got to the part where I read that it relies on an `etcd` cluster. While I don't have anything against `etcd`, I did not want to spin up another state management cluster if I didn't need to. So Flannel went in my back pocket, as a last resort.

**Weave** - Weave uses a proprietary routing fabric, rather than linux primitives (like iptables), it seemed like a good fit for my application, given the low barrier to entry and the simple configuration options when using it alongside Docker.

### Implementing Weavenet

I used Ansible to install Weave and its associated systemd unit.

```yaml
- name: Install Weave
  hosts: nomad
  tasks:
    - name: Install Weave
      uri:
        dest: /usr/local/bin/weave
        status_code: 
          - 200
          - 304
        url: https://git.io/weave
        mode: 0755
    
    - name: Create Systemd Service
      copy:
        dest: /etc/systemd/system/weave.service
        mode: 0755
        content: |
          [Unit]
          Description=Weave Network
          Documentation=http://docs.weave.works/weave/latest_release/
          Requires=docker.service
          After=docker.service
          [Service]
          EnvironmentFile=-/etc/sysconfig/weave
          ExecStartPre=/usr/local/bin/weave launch --no-restart --no-dns --ipalloc-range $IP_CIDR --metrics-addr=0.0.0.0:21049 $PEERS
          ExecStart=/usr/bin/docker attach weave
          ExecStop=/usr/local/bin/weave stop
          [Install]
          WantedBy=multi-user.target

    - name: Ensure sysconfig Directory Exists
      ansible.builtin.file:
        path: /etc/sysconfig
        state: directory

    - name: Create Weave Peers File
      copy:
        dest: /etc/sysconfig/weave
        content: |
          PEERS="10.0.10.48 10.0.10.64 10.0.10.80"
          IP_CIDR="172.30.0.0/16"

    - name: Start Weave Service
      systemd:
        state: restarted
        daemon_reload: true
        name: weave
```

I ended up overriding the default CIDR (`10.0.0/8`), as it conflicted with the parent network and explicitly listing all of the peer servers to avoid needing to join them manually.

I then ran `weave expose` on each of my nodes and added the `/24` returned to my router's static routes table, with the target being the node that returned the IP block. This enabled clients not part of the weave network to be able to access weave clients. From there, I just needed to explicitly set the `network_mode` in my Nomad Job Docker Configuration and ensure that the address mode was set to driver for my service definitions.

{{< github url="https://github.com/tpaulus/terraform-hashi/blob/main/jobs/alertmanager.hcl" caption="Example Configuration using WeaveNet" >}}

## Hey Siri

We have a handful of Apple's HomePod Mini's across the house and my partner and I both have iPhones, so it is handy to be able to ask Siri to turn on/off the lights and what not. The actual work is done via the [Home Kit Integration](https://www.home-assistant.io/integrations/homekit/) in Home Assistant.

One of my usual tests after I change something with either Home Assistant, or its network is to ask my office HomePod to turn on or off my Desk Lamp. Unsurprisingly, after I configured Weave on Home Assistant this stopped working. A bit of pondering lead to a potential issue. mDNS. When you pair a HomeKit device, you never put in an IP Address or other configuration, it is all handled via multicast DNS (mDNS), and now that Home Assistant was on a different subnet than the Home Pods, and iPhones, this connection was broken, despite the networks being accessible from one-another.

Conveniently this is not an uncommon problem, and it’s already been solved via tools like [mDNS Reflector](https://github.com/vfreex/mdns-reflector). Deploying a container that bridged the weave network and the server host network (which is the same one as the network our phones, HomePods, etc are connected to) instantly restored the connection between HomeKit on my phone and Home Assistant. And just like that, we were back in business.
