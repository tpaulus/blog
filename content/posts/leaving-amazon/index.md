---
title: Moving Beyond A→Z
slug: leaving-amazon
date: 2022-04-04T16:00:00.000Z
lastmod: 2023-12-10T15:59:44.000Z
tag:
  - Life
feature_image: media/external/d6a30c90726a416d-photo-1476297816471-97713c4d237c.jpg
---

I initially joined Amazon as a Software Engineering Intern in the summer of 2017, something I wrote about previously. In the three and a half years since I came back as a full-time engineer, I have poured my heart and soul into the service that would eventually become publicly known as [EC2 Image Builder](http://aws.amazon.com/image-builder/).

## The History of EC2 Image Builder

EC2 Image Builder started off as an internal service called the Cascading Curated Image Service (CCIS for short) and was part of the Amazon Elastic Beanstalk team. CCIS, while built to run on AWS Lambda, was a Java Monolith, with everything being inside a single, tightly coupled, code base. In April of 2019, our team was pulled into discussions with the Amazon Linux and EC2 Windows teams to provide expertise in building a public service to enable customers to build AMIs easier and faster. A lot of bureaucracy and meetings later, our team was moved to within the EC2 Windows Organization and we started building the service that would eventually become known as EC2 Image Builder. By this time it was June and the service was set to launch at [re:Invent](https://reinvent.awsevents.com), AWS' anual developer conference, in December.

We used those few months to rebuild the service from the ground up, only the Finite State Machine (FSM) from the original service survived. One of my responsibilities was to re-write the API stack to be faster, lighter, and compliant with the internal security standards for authentication and authorization. To enable lower latencies, we decided to move to Python, both because of its faster performance of Lambda (provisioned concurrency was not a thing when we started building) and the team had some prior knowledge. Many late nights and slices of pizza later, we fliped the switch and made the service public at 9PM Pacific Time on December 2nd, 2019.

It has been over 2 years since we launched the service and our adoption numbers look good and feedback from customers like AC3 and Genesys have been overwhelmingly positive. The team started very small, only four engineers, but has since grown to 10, many of whom I consider my friends.

## So, Why am I Leaving Amazon?

It all started in November 2021, when one of the other tenured members of the team left the company to go work for a local start-up. They were looking for a new challenge and did not feel like they were being appreciated for the work and effort they put in. Their responsibilities fell onto my shoulders when they left, but they also left behind the reminder that there are other options outside of Amazon. My long time manager and friend went on their Christmas vacation and came back with the news that they too were leaving the company, motivated by the words of the former employee, "it's nice to feel wanted."

The three of us got together the following weekend to discuss things over beer and pizza, both because we wanted to hear how the start-up life was going, and to reflect about our experiences at Amazon. What I learned about how management works at Amazon horrified me. I learned that one of the engineers I worked closely with and was consistently impressed with their work, was considered by the organization to be one of our "least effective" (worst) employees. I also learned that the bottom 5% of employees across teams would be forced out, something that [Insider covered last April](https://www.businessinsider.com/amazon-leaked-memo-focus-performance-review-unregretted-attrition-2021-4). On my team of 10, that meant likely 1 engineer had to go. At the same time, we had at least six open positions we were struggling to fill (some had been open over a year), things started to feel Sisyphean and dismal.

After my manager left, I started to spend most of my days in meetings. I spent very little time doing the things I liked to do, coding and designing solutions to complex problems. My job was not fun any more and I saw no improvements on the horizon. This was on top of a perpetual feeling of resentment towards senior leadership for not recognizing the contributions of engineers. I witnessed countless occasions where individuals worked long hours to get features delivered and bugs patched, with no recognition; but the second something went wrong, senior leadership was quick to scrutinize engineering for the issue.

I raised some of these concerns with my new manager (my previous skip-level manager) which triggered some reaction; which included reducing the amount of time I spent on-call (I was previously on-call 79% of days, 71 days of the quarter), and a "dive and save".

> A dive and save is an attempt by an employer to retain (or save) an employee who is looking to leave the company. Typically, these attempts result in compensation and/or role adjustments, but are generally considered to be a short-term tactic, rather than a long-term solution.

You know you have a problem when you have a codified mechanism for fixing your mistakes in a desperate effort to retain an employee. Additionally, increasing an individuals compensation without addressing the underlying issues does little to retain the employee long-term, it just keeps them there a few months longer. It was a recruiter who I spoke with that put it best, Amazon uses "golden handcuffs" to keep employees, paying them an exuberant amount of money to make up for the frustrations and long work hours.

## Finding a New Job

Given all that I had learned about how I was being managed, and my overall lack of excitement, I put my hat in the rink and started replying to recruiters who reached out to me on LinkedIn. I also applied directly to companies who I would like to work for.

I had some confidence that I would be able to find a new job, since at the time, a lot of people were changing jobs, fueled in part by the availability of remote work; and a deficit of engineers compared to the number of openings, making it an employee's market.

I applied to 14 different companies, either via a recruiter who reached out to me, or directly via their respective websites. I also got a number of messages via [Hired](http://hired.com), but none of those really spoke to me. I was looking for and applying to backend engineering and site-reliability software engineering positions since that is where I felt I can make an impact and have relevant experience. In no particular order:

-   Google - Despite having a number of internal references, after my on-site interview, I was only approved for offer at L3 (college-hire / junior engineer), and while that meant I would be able to do a lot more coding, it was not the direction I wanted to take my career in.
-   Discovery - After a few weeks of good discussions and interest from their sourcing company, I was told Discovery was no longer interested.
-   Microsoft - My recruiter felt that it would be difficult to find a team willing to take on a senior engineer with my \[lack of\] experience. I never heard back after our initial call back in January.
-   Coda - The recruiter scheduled an initial call, but needed to cancel last minute. They never reached out to reschedule.
-   RadAI - They were not able to meet my compensation expectations, and decided from their end not to go forward.
-   Apple - No response!
-   Hulu / Discovery - No response!
-   Slack / SalesForce - Form rejection email.
-   T-Mobile - No response!
-   Digital Ocean - I got an email that the position was eliminated, but that I would be considered for other positions. I never heard back.
-   NVIDIA - I got through a Phone Screen with them, but decided not to pursue the opportunity since I did not feel a strong connection with the team and their work.
-   Alaska Air - My lack of JavaScript experience (for a back end engineer position) immediately disqualified me and triggered an auto-rejection 15 minutes after I submitted my application.
-   Adobe - Form rejection email.

The keen eyed will notice, that I only listed 13 companies, and that is because I omitted one... Cloudflare.

## Where I'm Going

If it was not obvious from the last sentence, I'm going to [Cloudflare](https://www.cloudflare.com). I start as P3 (P1 = Junior, P5 = Principal) Systems Engineer with the APIs team on April 18th.

My interview process at Cloudflare started with a half hour Google Meet Call with one of the engineers on the team. We talked about my experience, and the position, and concluded with some homework. I was to design and implement a URL Shortening Service. This was somewhat ironic to me, since during my time at Amazon, my go to question for Intern interviews was a similar, but scoped-down, problem. I had also already built a [similar solution that leveraged AWS](https://github.com/tpaulus/python-urlshortener-cdk). However, when I got the requirements via email later that week, I needed to make some adjustments. Namely, the requirements included statistics (how often the URL had been accessed in the last 24 hours, week, and all time), as well as the ability to run locally in a development environment. Over the course of the weekend, I built a URL Shortener using Flask and PostgreSQL and was overall quite proud of [the GitHub repo I ended up submitting to them](https://github.com/tpaulus/url-shortner-flask).

It seems that the team at Cloudflare were also pleased with my work, since I was invited to a virtual on-site interview. I had interviewed (virtually) with Google the week prior, and the difference between the two was night and day. While the Google interviews felt like being in a juicer, with them attempting to squeeze my knowledge about algorithms and data structures out of me, my interviews with Cloudflare were much more fun and conversational. Yes, there were still questions to answer, but things felt significantly more casual. The tech lead of the team was the only one to ask me a traditional coding question, but even then, it was a collaborative exercise in JavaScript, a language I had little experience in (intentionally). All of my other interviews were pleasant and I got a good feel for the team as the interviews went on.

Nine interviews later, including a final call with President and Co-Founder [Michelle Zatlyn](https://en.wikipedia.org/wiki/Michelle_Zatlyn), I had an offer letter in hand, sent via email by the CEO, Matthew Prince, himself.

### Why Cloudflare?

I've been a Cloudflare user since September 2014 (I needed to check this via the API) and have been very happy with the service. I initially came to Cloudflare to take advantage of the free SSL certificates (Let's Encrypt was not a thing back then), and have since relied on Cloudflare more and more, most recently using their [Email Routing feature](https://blog.cloudflare.com/introducing-email-routing/) to replace some email routes I had configured in Mailgun a number of years ago.

Beyond being a good service provider, Cloudflare uses its powers for good, from making it easier for [healthcare providers to offer vaccine signups](https://www.cloudflare.com/healthcare/), to [protecting journalism](https://www.cloudflare.com/galileo/), to [ensuring state and local election bodies get the security support they need](https://www.cloudflare.com/athenian/).

When I am out and about and people ask me what I do and where I work, I am a bit embarrassed to say that I work for Amazon, due to the impact the company has had on Seattle and other neighboring cities, and the countless controversies sounding the Amazon Fulfillment Centers that give Amazon a negative name in the news.

Cloudflare is still a small company at only 2,500 employees world wide (nothing compared to the over 60,000 Amazon has in Seattle alone), but if the past is anything to go by, Cloudflare will continue to do things that make the internet better and safer for everyone.

### Why not a new team within Amazon?

At Amazon, internal mobility (being able to move from one team to another) is easy, and team culture varies drastically from team to team, and while I could easily find a new team within the company to work for, I feel a bit burned by Amazon. Even on this new team, there would still be stack ranking and URA (un-regretted attrition) targets. I also doubt I would be free of my old team and responsibilities completely. I think it is just better this way.
