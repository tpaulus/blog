---
title: Replacing PiHole with Cloudflare Gateway
slug: replacing-pihole-with-cloudflare-gateway
date: 2022-10-30T23:05:01.000Z
lastmod: 2022-10-30T23:05:01.000Z
draft: false
status: published
tag:
  - Software
description: I've been using PiHole for my home-network DNS for years, but
  Cloudflare Teams Gateway has enabled me to improve my DNS availability at
  home, and take it with me, on the go.
feature_image: https://unsplash.com/photos/photo-of-white-pipes-on-the-ceiling-nOVHbXwXCys
featured: false
ghost_id: 641e0dadc0c65700013898f6
ghost_uuid: 9a583368-7638-4077-9eb4-1616afca224a
url: /replacing-pihole-with-cloudflare-gateway/
---

Before I can dive into how I configured Cloudflare Teams Gateway to work for my home, I need to give a bit of context and what lead up to this. I began using PiHole a number of years ago, running on a Raspberry Pi Model 1B. That worked fine for a while until my partner moved-in. She would report that the internet would occasionally stop working for her, and most of the time, this turned out to be a DNS issue. Combined with the occasional hick-ups caused by running on an older, low-power SBC, the need for occasional reboots to install updates meant that it was time to setup a second PiHole to run along side the first. Those Raspberry Pis were eventually replaced with Docker Containers running on much beefier machines, but the occasional outages persisted. Either due to _fun_ intricacies of `macvlan` which is how the Docker Containers get their IPs on the network, or an over aggressive block list, it lead to both of us turning off WiFi when a page wouldn't load. Don't get me wrong, I love hosting my own infrastructure for all the things we need at home, but DNS is a fickle thing and issues with DNS can manifest themselves in the most peculiar, unsuspecting ways.

In a different thread, I started working for Cloudflare in April and quickly learned that a lot had changed since I became a Cloudflare User in 2014. More recently, Cloudflare has been expanding in the Zero-Trust space with tools and service aimed at making securing corporate infrastructure easier, while enabling work-from-home. One of these products is Gateway, which is part of the larger Zero Trust offering (and has a very generous free plan, which is what I use). Gateway DNS, which is what we'll be discussing for the rest of this post, brings firewall style polices to DNS resolution, all while being wicked fast, which is critical for a DNS service.

So, how did I go about moving from PiHole to Gateway for my at home DNS resolution. Well, making the actual switch is as easy as updating your router's DHCP DNS settings to inform clients of the Gateway DNS IP address, instead of the IP addresses of the PiHole containers. While that will get your DNS request off of PiHole, there is a bit of extra work needed to get similar levels of privacy and security from Gateway DNS.

First, a bit of house-keeping. Because there is a limited number of IPv4 addresses available (and they are in short supply), Gateway DNS re-uses the same IP addresses across many different customers (customizing the IP Address is an enterprise level feature), so Gateway DNS uses the source IP of the request to associate the incoming request with your account. For those with a static public IP address, it's a set it and forget it affair, but for those who can't get a static IP (or don't want to pay $15/month for the privilege) we need to get a bit creative. I ended up writing this simple script which runs on one of my servers every 15 minutes to check my public IP and update it if necessary.

So, at this point we have Gateway DNS configured to always have the correct Public IP, but we haven't established any rules yet. I've been exploring Terraform in my free time, in part because of how much we use it internally at Cloudflare to manage our configuration. While updating the Public IP via Terraform seems a bit overly complex since it can change often, using Terraform to define the Gateway Policies seemed like a perfect fit. That's a long, round about way of saying, I defined the Gateway Policies in Terraform.

{{< github url="https://github.com/tpaulus/terraform-cloudflare/blob/c2f4d6768d8f3ce3e805db532304c1e473ec6fc3/main.tf#L224-L294" >}}

You'll want to configure the rules for your Gateway based off of your needs, but for me, I blocked content categories identified as security risks (i.e., New Domains, Parked Domains, Malware, Phishing) as well as any traffic destine for the TOR Network. Additionally, I maintain a manual list of Trackers and Advertisers I don't want to see and block them by domain name. Cloudflare's domain classification is pretty good, but the manual list allows me to quickly block a domain without updating the policies to include that specific hostname.

With all that configuration complete and the logging tuned, we can actually update the router configuration to route DNS requests to Gateway. That covers requests coming from you home, but the awesome part of all of this is these protections and configurations can move with me via the Cloudflare 1.1.1.1 app (a.k.a. WARP), Cloudflare's take on a VPN. By enrolling the device in my Zero Trust account, these same Gateway policies will apply to requests made from those devices, regardless of where they are in the world, as long as WARP is enabled. WARP also enables some really slick split tunneling that leverages Cloudflare Tunnels (f.k.a Argo Tunnels) which allow me to access my home network from anywhere, without using port-forwarding on my home router.

Cloudflare Gateway is not designed to be an ad and tracker blocker like PiHole and it would take significant effort to configure Cloudflare Gateway to block 158,614 domains sourced from the known ad-lists. But so far, this replacement does an all right job, while ensuring DNS is highly available for my home network without too much hassle, with the bonus of being able to take it with me, wherever I go.
