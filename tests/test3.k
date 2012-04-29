var Shape = take x, y ->
  this.x = x
  this.y = y

var Rectangle = take x, y, width, height ->
  this : Shape(x, y)
  this.height = height
  this.width = width

Rectangle::area = do ->
  return this.width * this.height

var rect = new Rectangle(0, 0, 20, 10)