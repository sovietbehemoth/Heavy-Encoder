# Heavy-Encoder

A custom encryption algorithm codec.

The encryption algorithm works with an I/O concept, much like other encryption algorithms; as such, the key is sacred and should only be sent to those
whom you trust with decrypting your encrypted text.

This implementation is built to work with 7 bit ASCII; 8 bit ASCII could theoretically be used simply by changing a constant therein. The main reasons for
using only 7 bit ASCII are compatibility and simplicity: most text codecs (i.e. terminals, text editors) support 7 bit ASCII, but if 8 bit ASCII is not supported, 8
bit characters will not be encoded correctly and the key validation and/or codec process will likely fail. Moreover, 8 bit ASCII consists of relatively uncommon
characters that are unlikely to be used in most contexts, and 8 bit ASCII consists of 224 chars, thereby drastically increasig key size and complexity. FOr the purpose
of simplicity, 7 bit ASCII is used to prevent storing IDs of characters which are highly unlikely to be used.

The codec utilizes a multidimensional model with as much pseudorandom number generation used to generate lengths as possible, while not drastically increasing
complexity or decreasing performance. The complexity and size of the key is directly proportional to both the range of ASCII values supported and the various upper-bound
limits used in the generation process. As such, the size of output buffers increases proportionally. As a result of these factors, more secure keys also result
in larger output buffers, larger keys, and a relative decrease in performance.

In essence, each ASCII char is represented by an array of random strings, whose lengths are also randomly generated; the length of the array of strings is also
randomly generated. It is important to note that every random number generated has an upper-bound limit, though this upper-bound limit is arbitrary. Also for each 
ASCII char exists a random pattern. In iterating through the input text, per each occurance of any given character, said pattern is iterated. The pattern will restart
upon being completed. In this implementation, patterns cannot exceed 9 iterations due to the design of the key; patterns do not need delimiters due to the 
lack of 2 digit numbers, this could be changed simply by adding a pass to the key generator and validator.

Many of the constants defined in the implementation file are arbitrary, but chosen by effectiveness therein:

SECTION_DELIM: defines the string used to separate key sections.
PATTERN_DELIM: defines the string used to separate patterns.
CORE_UNICODE_DELIM: defines the string used to separate sub-keys in the ID section.
CORE_KEY_DELIM: defines the string used to separate each ID, probably the most impactful delimiting constant due to its heavy usage.

ASCII_RANGE: The range of ASCII values which will be indexed by the codec, offset by 32.
MIN_ASCII: The lower-bound of ASCII values accepted by the codec. The default value is 32 because each ASCII value below 32 is a whitespace character.
MAX_ASCII: The upper-bound of ASCII values accepted by the codec. This value could theoretically be increased to 256 as to support 8 bit ASCII.

An example of a representation of an ASCII value is as follows:
```js
{
  ids: ["sA9*4@a=", ...],
  pattern: [ 1,6,3,5,9,4,2,7,8 ]
}
```
