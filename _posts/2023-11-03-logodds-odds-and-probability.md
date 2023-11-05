---
title: Log Odds, Odds, and Probability
date: 2023-11-03 16:29:17 +/-0500
categories: [Statistics]
tags: [sta235, logistic regression]     # TAG names should always be lowercase
math: true
---

## The Simple Model
An important concept to understand in logistic regression is the relationship between the log odds, odds and probability of an event. Recall that our most basic logistic regression models the log odds of an event as a linear function of the predictor variable.

$$ \log \frac{p}{1-p} = \beta_0 + \beta_1 x $$

The right hand side of this equation is treated identically to what we know from classical regression. We can add multiple predictors, transformations of predictors, categorical predictors, interactions between predictors -- you name it. And, just as in our classic regression, a unit increase in $x$ results in a $\beta_1$ increase in $y$, which for logistic regression is the _log odds_ rather than, say, income or sales price. However, the log odds are not a very intuitive measure and fortunately for us, the transformation from log odds to odds is rather simple--we just exponentiate them! Our equation becomes:

$$ \frac{p}{1-p} = e^{\beta_0 + \beta_1 x}$$

Now we have an equation for the odds (or odds ratio) but it is no longer linear. The good news is that we can still describe the change that happens to the odds when $x$ changes. Assume $x$ increases by an amount $\delta$. Then we have a new odds ratio:


$$ 
\begin{align*}
\mathrm{odds}(x+\delta) & = e^{\beta_0 + \beta_1 (x+\delta)}\\
              & = e^{\beta_0 + \beta_1 x + \beta_1 \delta}\\
              & = e^{\beta_0 + \beta_1 x} e^{\beta_1 \delta}\\
              & = \mathrm{odds}(x) e^{\beta_1 \delta}
\end{align*}
$$

Note in the last line above we have formulated the new odds ratio of this change in $x$ relative to the odds ratio for $x$. Regardless of the value of $x$, an increase in $x$ by $\delta$ results in the odds being multiplied by $e^{\beta_1 \delta}$.

Lastly, we may want to consider the probability of an event occurring for some value of $x$. Again we can rewrite our equation with some algebra to obtain

$$ 
p = \frac{e^{\beta_0 + \beta_1 x}}{1+e^{\beta_0 + \beta_1 x}}
$$

This is definitely non-linear, but it does satisfy the things we need from a probability: it's bounded between 0 and 1. As the odds ratio goes to infinity, the probability approaches 1[^1]. Likewise, as the odds ratio goes to zero, the probability also goes to zero[^2].

Let's take an example of the log odds represented by the equation

$$ \log \frac{p}{1-p} = -10 + 0.4 x $$

![Desktop View](/assets/img/logodds_odds_prob.svg){: w="700"}
_Comparison of graphs of log odds, odds, and probability._
Even, or 1:1 odds, correspond to a log odds of 0, since $\log(1)=0$. From our equation, we can compute that this occurs when $x=25$. Also from our equation, we know that each one unit change in $x$ increases the log odds by 0.4. The center plot shows the non-linearity of the relationship between odds and $x$. Here, a one unit change in $x$ multiplies the odds by $e^{0.4}\approx 1.49$ or, put another way, increases them by 49%. It's easy to see how this leads to rapid growth in the odds ratio: from even odds at $x=25$ we get 1.49:1 odds when $x=26$, and 2.22:1 odds at $x=27$. The absolute difference continues to grow at an ever larger rate. Lastly, as described above, the graph of probability as a function of $x$ is S-shaped, with high probability associated with positive log odds and high odds, low probability associated with negative log odds and small (close to 0) odds, and 0.5 probability with even (1:1) odds and 0 log odds.

## Example: Account Standing at a Bank
A bank has a list of customer accounts that are either in good or bad standing. In addition, they have demographic information on the customer including but not limited to their age, gender, and number of dependents, to name a few. We build a simple model predicting the probability of an account being in bad standing given the customer's age. The resulting model is:

$$ \log \frac{P(\mathrm{Bad Standing})}{1-P(\mathrm{Bad Standing})} = 10.12 - 0.32(\mathrm{Age}) $$

![Desktop View](/assets/img/banco_logodds_odds_prob.svg){: w="700"}
_Log odds, odds, and probability for our account in the bad standing model._
This time our model has a negative coefficient on the independent variable, meaning that the log odds, odds, and probability of an account in bad standing all decrease as the account holder gets older. Approximately around the age of 32 does it become more likely that the individual has an account in good standing rather than in bad standing. For each year increase in age, the log odds decrease by 0.318 and the odds are multiplied by $e^{-0.318} \approx 0.73$ or equivalently, decrease by 27%.

## Example: Interactions Between Predictors
Consider the previous example but now we add in as an additional predictor whether or not the customer has another line of credit, and an interaction between this categorical predictor and their age. The log odds are modeled by the relation:

$$ \log \frac{P(\mathrm{Bad Standing})}{1-P(\mathrm{Bad Standing})} = 18.16 - 0.59(\mathrm{Age})- 12.19(\mathrm{OtherCredit}) + 0.41(\mathrm{Age})(\mathrm{OtherCredit}) $$


![Desktop View](/assets/img/banco_int_logodds_odds_prob.svg){: w="700"}
_Log odds, odds, and probability for our account in the bad standing interaction model. Red represents no other line of credit, while blue represents another line of credit._

Now we get into the good stuff! The graph of the log odds should look very familiar to someone who has studied interactions in linear regression, since the log odds are modeled with a linear relationship. The log odds for someone with another line of credit decrease at a slower rate as age increases than the log odds for someone without another line of credit, seen by slopes of -0.59 and -0.18, respectively. Due to the scale of the y-axis the graph of the odds is hard to parse, however, the two lines do indeed cross around 30 years of age, just as they do for the log odds and the probability. For those without another line of credit, the odds decrease by 45% $(e^{-0.59}-1\approx-0.45)$ for each year increase in age, while for those with another line of credit the odds only decrease by 16% $(e^{-0.18}-1\approx-0.16)$ for each year increase in age. 

Observe that older customers are more likely to have an account in bad standing when they have another line of credit than if they do not, while the opposite is true for younger customers. Age also has more of an impact on the likelihood of an account being in bad standing for those customers without another line of credit. This is apparent in the steeper slope of the log odds, and the central portion of the probability graph.

## Conclusion
Hopefully this has provided a bit of clarity on the relationship between log odds, odds, and probability. Understanding and being able to work freely in any of the three domains is a valuable skill to possess.  Don't hesitate to reach out with any questions you may have or any feedback you would like to give.

[^1]: Infinity over infinity+1 is almost, but not quite 1, and can never be greater than 1. Infinity+1 is also a great number for beating your sibling at "Who can say the largest number?"
[^2]: Essentially zero over 1+essentially zero is essentially zero.