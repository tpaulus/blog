---
title: Backing up Unifi Protect
slug: backing-up-unifi-protect
date: 2023-05-24T01:16:32.000Z
lastmod: 2026-05-10T02:20:32.000Z
tag:
  - Software
feature_image: https://unsplash.com/photos/a-screenshot-of-a-video-game-5l0v2_B9MNI
---

A few weeks ago, I was scrolling through the [r/Ubiquiti Subreddit](https://www.reddit.com/r/Ubiquiti/) when I came across a post where someone had their NVR stolen during a break in. We have a number of Protect cameras across the house and the post got me thinking... I have offsite backups of data stored on the NAS, but not the NVR. A lot of the recordings are useless, but it would be really nice to have the events stored offsite for a few days, just in case.

Luckily, the comments of the original post (which I can't find anymore) had a bunch of helpful suggestions, one of which being to run [unifi-protect-backup](https://github.com/ep1cman/unifi-protect-backup) on a Raspberry Pi. However, because Pis are in short supply right now, and because I don't love running Pis for production workloads, I wanted to run the backups from the NVR itself. I thought that the NVR had enough spare CPU and Memory to do the work, and had all the data available locally, but boy was I mistaken.

Since I wanted to both encrypt and compress the video files before uploading them, this turned out to be a computationally expensive operation and when run on the NVR, would result in a lock-up that would only be resolved by a power-cycle.

Since I had [recently started using Nomad for my Container Orchestration](/resilient-homelab-infrastructure/), I opted create a Nomad Job for this task and have the job run from one of my servers, where significantly more CPU was available, and I did not risk locking up the NVR. The Nomad Job configuration ended up being much simpler than the work needed to get the backups running on the NVR (especially since the NVR likes to reset things after updates).

{{< github url="https://github.com/tpaulus/terraform-hashi/blob/main/jobs/backup-unifi-protect.hcl" >}}
