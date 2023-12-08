---
title: Regression Discontinuity
date: 2023-11-23 00:54:00 +/-0500
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
Let us take a closer look at the tutoring example and see how we can use regression discontinuity to estimate a treatment effect. It is clear from the plot that around the cutoff of 70 those that did receive a tutor performed better on the exit exam than those that did not. The idea behind regression discontinuity is to use the data to predict the outcome values at the cutoff for both treated and untreated groups. In the case of our example, we'd be estimating the exit exam score for a student who scores a 70 on the entrance exam with and without a tutor. 
![tutoring scatter](/assets/img/tutoring_scatter.svg){: w="700"}
_A plot of entrance exam scores against exit exam scores. Those who scored below a 70 on the entrance exam were assigned a tutor for the semester._

How can we predict values around the cutoff? There are numerous ways to do so but one of the easiest ways is linear regression. We can fit a (discontinuous) line to the data and then use it to estimate the jump. First, we center our running variable at the cutoff by subtracting the value of the cutoff—this means that an entrance exam score of 70 has a *centered* entrance exam score of 0, an entrance exam score of 80 has a *centered* entrance exam score of 10, an entrance exam score of 65 has a *centered* score of -5, and so on. The reason for doing this will become clear in just a moment. We also create a dummy variable for the treatment, which takes the value 1 when the centered score is negative, and the value 0 when the centered score is positive, corresponding to when the un-centered entrance exam score is below 70 and above 70, respectively.


![tutoring scatter fitted](/assets/img/tutoring_fitted_equal.svg){: w="700"}
_A plot of entrance exam scores against exit exam scores. Those who scored below a 70 on the entrance exam were assigned a tutor for the semester. A linear fit with equal slopes was applied._

The difference in the lines at the cutoff of 70 is the estimate of the effect we are looking for. Here's how we would do that in _R_. Assume `tutoring` is our original dataset with entrance exam and exit exam scores.

```
tutoring <- tutoring %>% mutate(centered_entrance = entrance_exam-70,
                                tutor = ifelse(centered_entrance<0, 1, 0)
                                )
rd_model <- lm(exit_exam~centered_entrance+tutor,data=tutoring)
summary(rd_model)
```
We build the model using the `centered_entrance` and `tutor` variables we created. This results in the following estimated equation for exit exam score:

$$ 
\widehat{\mathrm{exit\_exam}} = 59.34 + 0.51(\mathrm{centered\_entrance}) + 10.97 (\mathrm{tutor})
$$

What does the intercept of 59.34 represent here? It is the value of `exit_exam` when all our independent variables are 0, which means that a student that scores a 70 on the entrance exam (equivalent to a centered entrance exam score of 0) and did not receive tutoring is predicted to score around 59.34 on the exit exam. If that same student happened to get a tutor[^1], then their exit exam score is expected to increase by 10.97 points! The value of the coefficient of `tutor` is the estimated effect. The coefficient on `centered_entrance` tells us by how much the exit exam score is expected to change for each additional point increase in entrance exam score holding the value of `tutor` constant. Because there is no interaction term in the model that we fit, the slope is the same for both sides of the discontinuity. 

Had we instead used the entrance exam score in our model instead of the _centered_ score, then the intercept would represent the exit exam score of an individual who scores a 0 on the entrance exam and does not receive tutoring. This is meaningless in the context of this problem, and we would need to substitute in values of 70 to estimate the effect at the cutoff. By using the centered running variable, we get all of our estimates for "free".

[^1]: Technically, you cannot score a 70 and both get a tutor and not get a tutor. So we can think of this as comparing a student _just_ over 70 and one _just_ below 70.

## Adding Flexibility
In the previous section we assumed the slopes of the lines to be equal on both sides of the cutoff. Fitting a model with an interaction between the centered entrance score and tutoring we get an equation not all that different from our equal slopes model.

$$ 
\begin{align*}
\widehat{\mathrm{exit\_exam}} = 59.34 & + 0.51(\mathrm{centered\_entrance}) + 10.97 (\mathrm{tutor}) \\
& + 0.002(\mathrm{centered\_entrance}) (\mathrm{tutor})
\end{align*}
$$

Our read of the effect is done in the exact same way: by looking at the coefficient on `tutor`. The interaction effect will now cause the slopes to be _different_ on either side of the cutoff. In the model with interactions, students without tutoring are predicted to score 0.51 points higher on the exit exam score for every increase in entrance exam score, while those who receive a tutor are predicted to score 0.512 points higher. This may seem like an inconsequential difference, and indeed if we were to look at the summary output we would see that the interaction term is not statistically significant. Looking at plot of the fitted values shows imperceptible differences. The estimated effect size remains the same at 10.97.

![tutoring scatter fitted interaction](/assets/img/tutoring_fitted_interaction.svg){: w="700"}
_A plot of entrance exam scores against exit exam scores. Those who scored below a 70 on the entrance exam were assigned a tutor for the semester. A linear fit with slopes allowed to differ on either side of the cutoff was applied. It is hard to see the difference between the two models._

We can go one step further and address the bandwidth. Before we used the entire set of data to estimate our regression line. There may be certain factors or attributes that bias our estimates the further away we go from the cutoff, neccesitating a need to reduce our bandwidth. Using our tutoring example, let's reduce the bandwidth to 5, meaning we only consider scores between 65 and 75 for estimating the effect.

![tutoring scatter fitted interaction short bandwidth](/assets/img/tutoring_fitted_interaction_bw5.svg){: w="700"}
_A plot of entrance exam scores against exit exam scores. Those who scored below a 70 on the entrance exam were assigned a tutor for the semester. A linear fit with slopes allowed to differ on either side of the cutoff was applied with a bandwidth of 5. The difference in slopes of the two lines is now apparent._

$$ 
\begin{align*}
\widehat{\mathrm{exit\_exam}} = 59.68 & + 0.72(\mathrm{centered\_entrance}) + 10.1 (\mathrm{tutor})\\
& - 0.38(\mathrm{centered\_entrance}) (\mathrm{tutor})
\end{align*}
$$

Observe that the line on the right side of the cutoff has a steeper slope of 0.72 compared to that of the slope on the left side of the cutoff, which has a slope of only 0.34 (0.72-0.38). The effect of tutoring on the exit exam score has also fallen from 10.97 in our full data models to only 10.1 in our smaller bandwidth model. 

## Even More Flexibility
With a more exaggerated example using synthetic data, we can see how a more flexible model might capture the true effect more closely. The first two linear models seen in the top half of the plot are using the full range of data to estimate the values around the cutoff, but because the relationship between the outcome and the running variable is nonlinear—the values close to the cutoff are rather biased.  

![flexibility 2 by 2](/assets/img/flexibility_2_by_2.svg){: w="700"}
_Clockwise from top left: No interaction model, model with interactions, model with interactions and narrow bandwidth, model with 2nd order polynomial fit._

The model in the bottom left is using a 2nd degree polynomial with an interaction, while the one in bottom right is using a linear model but with a narrower bandwidth. The polynomial model can capture the nonlinearity and the model with a narrow bandwidth suffers less from a linear approximation to the data relative to the model with the full range of data.
