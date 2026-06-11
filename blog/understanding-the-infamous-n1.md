---
title: "Understanding the infamous N+1"
date: 2023-11-04
summary: "A plain-language explanation of the N+1 performance anti-pattern, why it matters, and how teams detect and fix it."
---

One day at a work dinner, one of my favorite designers asked "so what is this N+1 thing that everyone talks about here?" Then I realized that I stumbled. I found it hard explaining the exact definition as well as why we call it that way. Even though we are using the phrase everyday and I even worked on removing some N+1s. In this article, I strive to explain this mysterious "N+1" in a way that hopefully everyone can understand.

### What is N+1?

In essence, "N+1" is a performance anti-pattern:

> when your code executes N additional query statements to fetch the same data that could have been retrieved when executing the primary query.

Source: [Understanding and fixing N+1 query](https://medium.com/doctolib/understanding-and-fixing-n-1-query-30623109fe89)

This performance anti-pattern usually happens in the context of database queries but can apply to other context such as rest api queries.

When I searched online articles, "N+1" is also referred to as "N+1 query" and "select N+1" and are often defined in slightly different ways depending on what context you are talking about. See appendix if you are interested in how other sources define "N+1"s.

### What exactly does that mean.. also why is it called N+1?

The definition can feel a bit abstract. The best analogy to understand this concept for me is the car-wheel analogy.

Let's say you need to assemble cars. As a part of the manufacturing, you need to make trips to different locations to fetch various car parts. To simplify, let's say you need car bodies from city A and wheels from city B. Now the goal is to fulfill your orders of manufacturing N cars.

An "N+1" way of doing this would be this (in which case you make a total of N+1 trips):

- (1 trip) Make a trip to city A to get all the car bodies
- (N trips) For each of the N car bodies, you do these:
  - Check order details to find out what 4 wheels the car needs
  - Make a trip to city B to fetch those 4 wheels
  - come back to your warehouse to finish assembling this 1 car

However you realized that there's a much more efficient way:

- (1 trip) Make a trip to city A to get all the car bodies
- Check all orders to find out all the corresponding wheels for the N cars you need to make (4N wheels in total)
- (1 trip) Make a single trip to city B to get all the wheels
- come back to the warehouse to finish assembling all N cars

Now you only need to make 2 trips in total!

### Why do we care about N+1?

Using the same car-wheel analogy. You can see that the total time you need increase significantly as N grows, especially if the distance of the trips are long. If each trip to city A and B takes 3 days and you need to manufacture 20 cars. Then with "N+1" you'll need 63 days ((20+1)*3) when you only need 6 days ((1+1)*3)!

This works similarly for applications that need to access DB. Making a trip to DB is an expensive operation (compared to accessing cache and performance operations in memory) so we want to make as few trips as possible.

Because of this scaling factor of the N (moreover the cost can grow exponentially as you have nested N+1), your data fetching performance can improve significantly by avoiding N+1s. This means better user experience and most likely better conversion rate.

### N+1 & 1-to-many relationships

Some articles online couples "N+1" with 1-to-many relationships and regard N as the number of associations in the 1-to-many relationship (1:n association). This can be true in some cases (and maybe a lot of the cases in ORMs) but not always the case.

N+1 can happen when there's 1-to-1 relationship too. Using the same car-wheel example above, we can imagine building a new single wheeler vehicle (with a 1:1 relationship) and still encountering the same N+1 issue when building N such single wheelers. In our car-wheel example, the N is actually the number of the parent objects.

For this reason, I think those definitions of the "N" in the "N+1" is more accurate:

- [SigNoz: N+1 Query Problem in Distributed Tracing](https://signoz.io/blog/N+1-query-distributed-tracing/): where n is the number of related entities of the object.
- [Sentry: N+1 Queries](https://docs.sentry.io/product/issues/issue-details/performance-issues/n-one-queries/): the repeating span is the "N" of N+1 queries.

### When do N+1 usually happen?

- N+1 & ORM
  - ORM (Object-Relational Mapping) is an extremely helpful tool to allow you work with data and write object-oriented application without writing the underlying db queries. But because it abstract away data access, it can be prone to inefficient queries that lead to N+1.
  - This article explains pretty well how ORM can lead to N+1: [Digma: N+1 query problem and how to detect it](https://digma.ai/blog/n1-query-problem-and-how-to-detect-it/)
- N+1 & GraphQL
  - GraphQL is great in avoiding over-fetching but is also prone to N+1 because the way Graphql resolve the queries. Compared to Rest, N+1 can be worse in GraphQL because "neither clients nor servers can predict how expensive a request is until after it's executed".
  - [Shopify Engineering: Solving the N+1 problem for GraphQL through batching](https://shopify.engineering/solving-the-n-1-problem-for-graphql-through-batching)
- N+1 & Rest apis
  - N+1 can happen in the context of rest api as well! In this case, the expensive part would be the trip from client to server to make a network request.
  - [REST API N+1 Problem](https://restfulapi.net/rest-api-n-1-problem/)

### Detecting N+1

N+1 is "infamous" because it can be tricky to detect from the DB query logs only, especially in a distributed system because unlike slow queries logs, each individual unnecessary queries appears healthy on the surface.

The best tool would be trace/span analysis which records the hierarchical information between the queries. Read more at:

- [SigNoz: N+1 Query Problem in Distributed Tracing](https://signoz.io/blog/N+1-query-distributed-tracing/)
- [Sentry: N+1 Queries](https://docs.sentry.io/product/issues/issue-details/performance-issues/n-one-queries/)

### Fixing N+1

You can find a pretty good summary at [freeCodeCamp: What is the N+1 Query Problem?](https://www.freecodecamp.org/news/n-plus-one-query-problem/)

1. Eager Loading (Using SQL Joins, for example). Learn more at:
   - [SitePoint: The Silver Bullet to the N+1 Problem](https://www.sitepoint.com/silver-bullet-n1-problem/)
   - [Sipios: Eliminate Hibernate N+1 Queries](https://www.sipios.com/blog-posts/eliminate-hibernate-n-plus-1-queries)
2. Batch Loading. Learn more at:
   - [Shopify Engineering: Solving the N+1 problem for GraphQL through batching](https://shopify.engineering/solving-the-n-1-problem-for-graphql-through-batching)
3. Caching
4. Lazy Loading
5. GraphQL Dataloader. Learn more at:
   - [Apollo GraphQL: Handling N+1 queries in federation](https://www.apollographql.com/docs/technotes/TN0019-federation-n-plus-1/)
   - [GraphQL DataLoader](https://github.com/graphql/dataloader)

---

### Reference

- [SitePoint: The Silver Bullet to the N+1 Problem](https://www.sitepoint.com/silver-bullet-n1-problem/)
- [Sentry: N+1 Queries](https://docs.sentry.io/product/issues/issue-details/performance-issues/n-one-queries/)
- [PlanetScale: What is the N+1 query problem and how to solve it](https://planetscale.com/blog/what-is-n-1-query-problem-and-how-to-solve-it)
- [Stack Overflow: What is the N+1 selects problem in ORM](https://stackoverflow.com/questions/97197/what-is-the-n1-selects-problem-in-orm-object-relational-mapping)
- [AppDynamics: Common application problems and how to fix them](https://www.appdynamics.com/blog/product/common-application-problems-and-how-to-fix-them-the-select-n-1-problem)
- [Stack Overflow: What is the solution for the N+1 issue in JPA and Hibernate](https://stackoverflow.com/questions/32453989/what-is-the-solution-for-the-n1-issue-in-jpa-and-hibernate)
- [Meta Engineering: TAO, the power of the graph](https://engineering.fb.com/2013/06/25/core-infra/tao-the-power-of-the-graph/)
- [Sipios: Eliminate Hibernate N+1 Queries](https://www.sipios.com/blog-posts/eliminate-hibernate-n-plus-1-queries)
- [SigNoz: N+1 Query Problem in Distributed Tracing](https://signoz.io/blog/N+1-query-distributed-tracing/)
- [Medium: Understanding and fixing N+1 query](https://medium.com/doctolib/understanding-and-fixing-n-1-query-30623109fe89)
- [AppSignal: N+1 queries explained](https://blog.appsignal.com/2020/06/09/n-plus-one-queries-explained.html)
- [freeCodeCamp: What is the N+1 Query Problem?](https://www.freecodecamp.org/news/n-plus-one-query-problem/)
- [Schneide Blog: Understanding, identifying and fixing the N+1 query problem](https://schneide.blog/2021/12/06/understanding-identifying-and-fixing-the-n1-query-problem/)
- [REST API N+1 Problem](https://restfulapi.net/rest-api-n-1-problem/)
- [Hacker News discussion](https://news.ycombinator.com/item?id=29045443)
- [Apollo GraphQL: Handling N+1 queries in federation](https://www.apollographql.com/docs/technotes/TN0019-federation-n-plus-1/)
- [SQLServerCentral: How to avoid N+1 queries](https://www.sqlservercentral.com/articles/how-to-avoid-n1-queries-comprehensive-guide-and-python-code-examples)
- [Shopify Engineering: Solving the N+1 problem for GraphQL through batching](https://shopify.engineering/solving-the-n-1-problem-for-graphql-through-batching)

---

### Appendix

Here are some of the definitions/explanations of N+1:

- Sentry describes N+1 as database queries made in a loop instead of one query that handles the full set.
- AppDynamics describes it as an application making `N + 1` database calls where `N` is the number of objects fetched.
- PlanetScale emphasizes the symptom: many repeated queries.
- Schneide Blog frames it around application code fetching objects first, then fetching associated entities one by one.
- SigNoz defines it as related entities being queried individually, leading to `O(n)` queries.
- Digma connects the issue to leaky ORM abstractions.
- Medium / Doctolib highlights the repeated additional query statements after the primary query.
- RESTfulAPI.net applies the pattern to web APIs, where a client must call the server repeatedly to fetch child resources.
