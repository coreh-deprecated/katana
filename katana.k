page, replace content:
  content, match regexp: /<body>/
  -> body

  content, match regexp: /<title>
  -> title

  body? -> document body's innerHTML
  title? -> document title

page, navigate to url: dontPush:
  history push state:?
    $, get url:
