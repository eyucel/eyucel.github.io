---
title: Log Odds, Odds, and Probability
date: 2023-11-03 16:29:17 +/-0500
categories: [Statistics]
tags: [sta235, logistic regression]     # TAG names should always be lowercase
math: true
---


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

Lastly, we may want to consider the probability of an event occuring for some value of $x$. Again we can rewrite our equation with some algebra to obtain

$$ 
p = \frac{e^{\beta_0 + \beta_1 x}}{1+e^{\beta_0 + \beta_1 x}}
$$

This is definitely non-linear, but it does satisfy the things we need from a probability: it's bounded between 0 and 1. As the odds ratio goes to infinity, the probability approaches 1[^1]. Likewise, as the odds ratio goes to zero, the probability also goes to zero[^2].

Let's take an example of the log odds represented by the equation
$$ \log \frac{p}{1-p} = -10 + 0.4 x $$

![Desktop View](/assets/img/logodds_odds_prob_comp.png){: w="1600" h="500" }
_Comparison of graphs of log odds, odds, and probability._

[^1]: Infinity over infinity+1 is almost, but not quite 1, and can never be greater than 1. Infinity+1 is also a great number for beating your sibling at "who can say the biggest number?"
[^2]: Essentially zero over 1+essentially zero is essentially zero.