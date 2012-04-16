/* Without Offside Operator */
app.get('/users/:userId', take req, res {
  if req.params.userId == 'foo' {
    res.end('Hey, Foo!')
  } else {
    res.end('Hey, Someone Else')
  }
})

/* With Offside Operator */
app.get('/users/:userId', take req, res -> 
  if req.params.userId == 'foo' ->
    res.end('Hey, Foo!')
  else ->
    res.end('Hey, Someone Else'))

/* Mix and Match */
app.get('/users/:userId', take req, res {
  if req.params.userId == 'foo' ->
    res.end('Hey, Foo!')
  else ->
    res.end('Hey, Someone Else')
})