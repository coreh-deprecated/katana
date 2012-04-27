// Number literals
2;
2.0;
2e+0;

// String literals
'test';
"test";
'test with "';
"test with '";
"test with escape sequences\n\t\"";
'test with escape sequences\n\t\"';

// Object literals
{};
{ foo: 1 };
{ foo: 1, bar: 2 };
{ foo: 1, bar: 2, foobar: { foo: 1 }};
{ 'foo': 1 };
{ 'foo': 1, 'foo': 2 };
{ 'foo': 1, 'foo': 2, 'foo': { foo: 1 }};
{ 1: 'a' };

// Function literals
take x, y, z { };
do { };