---
layout: home
title: The Katana Programming Language
tagline: A cutting edge programming language
---

# Katana <small>— have your cake and eat it</small>

## What is katana?

**Katana** is a general-purpose programming language currently under development as a research project at the Department of Computing of the [Federal Center of Technological Education of Minas Gerais](http://decom.cefetmg.br).

The language goal is to combine JavaScript's semantics with C's performance and predictability. Its no-compromise approach makes it ideal for writing games, web servers, compilers and mobile applications.

Once fully-functional, the Katana compiler will use your existing C compiler as a back-end, so that you can quickly get your code running on just about anything.

![Katana Compilation Process](/assets/images/compilation.png)

## Language Features

- Object Orientation with Prototypal Inheritance
- JS-Like objects & arrays
- JSON for denoting object literals
- First class functions + closures
- Automatic Reference Counting
- Late *this* binding.
- CommonJS-like modules with automatic compilation of dependencies
- Small runtime library
- C-like syntax
- Optional Python-like offside syntax

## What does it look like? 

Katana's syntax makes the language look very similar to other C-like languages. At the same time, it allows for optional indentation-defined blocks, and for the omission of semicolons.

<pre>
<b>import</b> read, write <b>from</b> io/sync;

<b>int</b> n = read();

<b>var</b> factorial = <b>take</b> x {
  <b>if</b> x > 0 {
    <b>return</b> x * factorial(x - 1);
  } <b>else</b> {
    <b>return</b> 1;
  }
}

<b>int</b> r = factorial(n);

write(r);
</pre>

<pre>
<b>import</b> read, write <b>from</b> io/sync

<b>int</b> n = read()

<b>var</b> factorial = <b>take</b> x ->
  <b>if</b> x > 0 ->
    <b>return</b> x * factorial(x - 1)
  <b>else</b> ->
    <b>return</b> 1

<b>int</b> r = factorial(n)

write(r)
</pre>

{% include JB/setup %}
