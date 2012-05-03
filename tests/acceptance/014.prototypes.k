import pi, sqrt, pow, atan2 from math

var Positionable = take x, y ->
  this.x = x
  this.y = y

Positionable::angle = take that ->
  return atan2(this.y - that.y, this.x - that.x)
  
Positionable::distance = take that ->
  return sqrt(pow(this.x - that.x, 2) + pow(this.y - that.y, 2))

var Circle = take x, y, r ->
  this : Positionable(x, y)
  this.r = r
  
Circle::circumference = do -> return 2 * pi * this.r

Circle::area = do -> return pi * this.r * this.r

/* This is a method override */
Circle::distance = take that ->
  return this!Positionable::distance(that) - this.r - that.r

var c1 = new Circle(0, 0, 3)
var c2 = new Circle(10, 7, 5)

var a = c1.area()
var d = c1.distance(c2)