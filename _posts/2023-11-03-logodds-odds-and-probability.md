--
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

![Desktop View](/assets/img/logodds_odds_prob.svg){: w="700"}
_Comparison of graphs of log odds, odds, and probability._
Even, or 1:1 odds, correspond to a log odds of 0, since $\log(1)=0$. From our equation, we can compute that this occurs when $x=25$. Also from our equation, we know that each one unit change in $x$ increases the log odds by 0.4. The center plot shows the nonlinearity of the relationship between odds and $x$. Here, a one unit change in $x$ multiplies the odds by $e^{0.4}\approx 1.49$ or, put another way, increases them by 49%. It's easy to see how this leads to rapid growth in the odds ratio: from even odds at $x=25$ we get 1.49:1 odds when $x=26$, and 2.22:1 odds at $x=27$. The absolute difference continues to grow at an ever larger rate. Lastly, as described above, the graph of probability as a function of $x$ is S-shaped, with high probability associated with positive log odds and high odds, low probability associated with negative log odds and small (close to 0) odds, and 0.5 probability with even (1:1) odds and 0 log odds.

## Example: Good Credit/Bad Credit


[^1]: Infinity over infinity+1 is almost, but not quite 1, and can never be greater than 1. Infinity+1 is also a great number for beating your sibling at "who can say the biggest number?"
[^2]: Essentially zero over 1+essentially zero is essentially zero.