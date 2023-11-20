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

When analyzing the results, we need to be careful of what conclusions we draw. In the tutoring example, we can really only be confident in estimating the effect on students who score around 70. We wouldn't be able to say that the tutoring would have the same effect on students who scored 90 on the entrance exam. This holds true in the opposite direction as well. Though students who score 50s on the entrance exam may benefit from the tutoring, and if anything, need it more, we aren't able to precisely pin down what the effect is since we are analyzing those who score around 70 points.

## Estimating an Effect
Let us take a closer look at the tutoring example and see how we can use regression discontinuity to estimate a treatment effect. It is clear from the plot that around the cutoff of 70 those that did receive a tutor performed better on the exit exam than those that did not. The idea behind regression discontinuity is to use the data to predict the outcome values at the cutoff for both treated and untreated groups. In the case of our example, we'd be estimating the exit exam score for a stduent who scores a 70 on the entrance exam with and without a tutor. 
![tutoring scatter](/assets/img/tutoring_scatter.svg){: w="700"}
_A plot of entrance exam scores against exit exam scores. Those who scored below a 70 on the entrance exam were assigned a tutor for the semester._

How can we predict values around the cutoff? There are numerous ways to do so but one of the easiest ways is linear regression. We can fit a (discontinuous) line to the data and then use it to estimate the jump. We center our running variable at the cutoff by subtracting the cutoff—this means that an entrance exam score of 70 has a centered entrance exam score of 0, an entrance exam score of 80 has a centered entrance exam score of 10, an entrance exam score of 65 has a centered score of -5, and so on. The reason for doing this will become clear in just a moment. We also create a dummy variable for the treatment, which takes the value one when the centered score is negative, and the value zero when the centered score is positive, corresponding to when the entrance exam score is below 70 and above 70, respectively.


![tutoring scatter fitted](/assets/img/tutoring_scatter_fitted.svg){: w="700"}
_A plot of entrance exam scores against exit exam scores. Those who scored below a 70 on the entrance exam were assigned a tutor for the semester. A linear fit with equal slopes was applied._



