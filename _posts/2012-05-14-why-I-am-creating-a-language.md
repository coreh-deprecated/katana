---
title: Why I am Creating a Programming Language
tagline: (And You Should, Too!)
layout : post
category : meta
tags : [programming languages, reception, hindsight, rework, universal darwinism]
---
{% include JB/setup %}

![XKCD Comic on Standards](http://imgs.xkcd.com/comics/standards.png)

## An unusual week

If you are a frequent Hacker News visitor who is interested in programming language design, this week has probably not gone unnoticed to you: **Two new programming languages** were introduced: [C!](http://blog.lse.epita.fr/articles/12-c---system-oriented-programming.html) and [&#42;JS](http://mbebenita.github.com/Mvm/).

Before I jump right in and introduce a *third one*, I would like to comment on something that surprised me this week: The **unusually positive reception** given to these languages.

## A warm welcome

Over the years I've grown accustomed to the reception new programming languages usually get, to the point where I instinctively recoil when I see a new programming language being announced. You consistently get phrases like:

* "We don't need yet another programming language!";
* "I can already do that in <b>X</b>!";
* "You're only contributing to rework and fragmentation".

Putting aside the occasional snarky comment, what I saw this week was the exact opposite of this: **Insightful discussion and motivating posts**. The following comment (by Hacker News user antirez on the introduction of C!) specifically caught my attention:

*"I would love to see ten attempts every year, trying to solve the same  problem &#91;system programming&#93;."* ([Source](http://news.ycombinator.com/item?id=3948808))

This exactly sums up my feelings about designing new languages.

## You might not notice it was broken until someone fixes it

We need new programming languages. Why do we need them? Because statements taking the form **we don't need X** are, very often, wrong in hindsight. To give a few examples:

* Before JSON was [discovered](http://inkdroid.org/journal/2012/04/30/lessons-of-json/), an easy thought for someone using XML would be that "we don't need more formats to represent structured data in plain text";
* Before the iPhone launched (and keep in mind that was only five years ago), a whole industry had a very clear picture of what were and what were not the needs of their customers. Needless to say, they were pretty much wrong. Today's marketshare leader (Android) didn't even exist then;
* Same goes for the iPad (*"we don't need another tablet"*);
* [We don't need](http://www.extremetech.com/computing/79620-who-cares-about-googles-chrome-browser) [another browser](http://untyped.com/untyping/2008/09/02/googles-chrome-browser/).

## Programming languages are not A/C chargers

The [xkcd comic](http://xkcd.com/927/) on the beginning of this post (one of my personal favorites) has a pretty good point on the creation of new standards: When you create a new standard to address the problems of the existing *n* standards, **you end up with *n+1* standards.**

That's a real nuisance when you have to [plug an electric equipment you got from abroad to your outlet](http://en.wikipedia.org/wiki/AC_power_plugs_and_sockets#Types_in_present_use), or when the text of a Web page [shows up garbled](http://en.wikipedia.org/wiki/Mojibake) because someone messed up with their encodings.

When it comes to programming, having *n+1* languages is **not a nuisance**. If you think it is, you might be confusing programming languages with execution environments. For instance, calling C code from Java can be quite annoying because Java code runs on the JVM, while C code runs natively. Calling Scala code from Java or vice versa [is actually pretty straightforward](http://www.codecommit.com/blog/java/interop-between-java-and-scala). So is calling JavaScript from CoffeeScript. Or C from Objective-C, C++ or D.

Programming languages are not like A/C chargers. They are **tools for human expression**; and as such, you can never really have enough of them.

## It's not rework if it's not work

What about **all the rework** that goes into a new programming language? After all, you have to specify the grammar and semantics, write a compiler, debug it, write a run-time library, debug it, write a standard library, debug it... The list goes on indefinitely. From a pure cost/benefit perspective that time could sure be better spent on something else.

But then I ask you, why do people still paint? Anyone could surely hit Google [with a search for still life](http://www.google.com/search?q=still+life), copy the top image result and print it on a A3 sheet; it would be much cheaper than the cost of even a single canvas. But people still paint because painting is an intellectual endeavor: a *pretty fun* intellectual endeavor.

Coding is very much like painting. It can be work, but it can also be a past-time. Creating a new programming language can be really fun, and as a bonus you get to learn a lot about the fundamentals of computing.

## I'm not smart enough to create the ideal language, and I don't care

[Universal darwinism](http://en.wikipedia.org/wiki/Universal_Darwinism) is the extension of Darwinism to fields other than biological evolution. On [this TED Talk](http://www.ted.com/talks/susan_blackmore_on_memes_and_temes.html), Susan Blackmore elaborates on how **human ideas are subject to natural selection** just like living things. In fact, she states that whenever you have three fundamental factors in place &mdash; variation, selection and heredity &mdash; with enough time, design arises spontaneously.

Programming languages are subject to all of the three factors: Whenever you create a new programming language you add *variation*; since languages are inspired by other languages, you have *heredity*; finally, *selection* takes place thanks to popularity/obscurity. That means that us, mere mortals, can still contribute to the overall landscape of programming languages even if we're not white-bearded wizards, simply by *trying*. That is enough motivation for me to create a programming language. And I think you should try it too.

## Enter Katana

Katana is a new programming language I'm working on. Its goal is to mix high level JavaScript-like semantics with C in a natively compiled language that still favors performance and predictability. Possible applications include games, web servers, compilers and embed systems. Over the next few weeks I'll post more details on the thought process behind the language as well on the progress being made with the compiler.

![Katana Logo](/assets/images/logo.png)