---
title: Regression Discontinuity
date: 2023-11-17 13:15:00 +/-0500
categories: [Statistics]
tags: [sta235, regression discontinuity design, rdd, causal inference]     # TAG names should always be lowercase
math: true
read_time: false
---

## Regression Discontinuity
The idea behind regression discontinuity is rather simple: given some treatment that is assigned at some cutoff—people on one side of this cutoff get the treatment while those on the other side do not, we can compare people _just_ on either side of that cutoff. These people should not be that different, and whatever differences we do observe, we'd like to attribute to the treatment. To make things easier we'll introduce some terminology that is common when talking about regression discontinuity:
* Running Variable: Also called the forcing variable, this variable determines whether or not you are treated. For example, students who score below a 70 on an entrance exam are assigned a tutor for the duration of the semester. Here, the running variable is the score on the entrance exam, since that is what determines assignment to the treatment group.
* Cutoff: The value of the running variable to use in determining the treatment group. In the example above, the cutoff was the entrance exam score of 70. Below the cutoff you get a tutor, above the cutoff you don't.
* Bandwidth: This determines how much around the cutoff we want to consider in our analysis. Students who score right around 70 are likely pretty similar, as are those who score between 69 and 71. But using a larger bandwidth and moving further away from the cutoff may introduce differences from factors other than the treatment.

What we can do with 