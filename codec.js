//Encryption codec by sovietbehemoth.

//These values are constants that are essential to the program's function.
//These values can be changed to adjust to support 8 bit ascii.

const SECTION_DELIM = "---";        //Delimits the main key sections.
const PATTERN_DELIM = "|";          //Delimits the patterns.
const CORE_UNICODE_DELIM = "--";    //Delimits the subkeys.
const CORE_KEY_DELIM = "-";         //Delimits the IDs.

const ASCII_RANGE = 95;             //Total encodable character range.
const MIN_ASCII = 32;               //Lowest ASCII bound (at 32, all under is blank).
const MAX_ASCII = 127;              //Highest ASCII bound (above 127 is not guaranteed to work with every text encoder).


let TOTAL_CACHE_READS = 0;
let TOTAL_ADVANCEMENTS = 0;
let TOTAL_RESETS = 0;

//Utility functions.

//Look for ID in key.
function searchfor(key, id) {
    for (let i = 0; i < key.length; i++) {
        for (let j = 0; j < key[i].cycles.length; j++) {
            if (key[i].cycles[j] === id) {
                return true;
            }
        }
    } return false;
}

//Get all IDs from unicode character.
function get_cycles(index, unicode) {
    for (let i = 0; i < index.length; i++) {
        if (i === unicode) {
            return index[i];
        }
    }
}

//Key generation.

/**
 * Generate pseudo-random string.
 * @param {*} length Length of string.
 * @returns 
 */
 function random_string(length) {
    let rstr = "";

    for (let i = 0; i < length; i++) {
        //Lower bound: MIN_ASCII, upper bound: MAX_ASCII.
        let rand = Math.floor(Math.random() * (MAX_ASCII - MIN_ASCII) ) + MIN_ASCII;

        const char = String.fromCharCode(rand);

        //'-' cannot be used, it is used as a separator token in the key.
        if (char === "-") {
            i--;
            continue;
        } else rstr += char;
    }

    return rstr;
}

/**
 * Randomly generate pattern at which each ID will correspond to its respective ASCII char. 
 * @param {*} max max amount of iterations in pattern.
 * @returns 
 */
function form_pattern(max) {
    let i = 0;
    let pattern = [];

    while (i < max) {
        const rand = Math.floor(Math.random() * max);

        if (!pattern.includes(rand)) {
            pattern.push(rand);
            i++;
        }
    }

    return pattern;
}

/**
 * Randomly generate a raw key.
 * @param {*} max_cycles 
 * @returns 
 */
function generate_key(max_cycles) {
    let key = {
        core: [],
        pattern: []
    };

    const core_amount = [];

    //This determines the total amount of cycles that will be generated. 
    //Cycles are simply iterations of each corrosponding unicode character.
    //For example: This may decide that 'A' has 5 corrosponding ids, meaning
    //that 'A' can be represented by 5 total values.
    for (let i = 0; i < ASCII_RANGE; i++) {
        core_amount.push(Math.floor(Math.random() * max_cycles) + 3)
    } 

    for (let i = 0; i < ASCII_RANGE; i++) {

        //Basic structure push.

        key.core.push({cycles: []});
        for (let j = 0; j < get_cycles(core_amount, i); j++) {
            const id = random_string(core_amount[i]); //create cycle.
            if (searchfor(key.core, id)) { //ensure no duplicates.
                i--;
                continue;
            } key.core[i].cycles.push(id);
        }
    }

    for (let i = 0; i < ASCII_RANGE; i++) {
        const length = core_amount[i];
        key.pattern.push(form_pattern(length));
    }

    return key;
}

/**
 * Convert key from JavaScript object into consumable text.
 * @param {*} key Key as JavaScript object.
 * @returns 
 */
function encode_key(key) {
    let pattern = "";
    let keys = "";

    for (let i = 0; i < key.pattern.length; i++) {
        pattern += `${key.pattern[i].join("")}${i===key.pattern.length-1?'':PATTERN_DELIM}`
    } 

    for (let i = 0; i < key.core.length; i++) {
        keys += `${key.core[i].cycles.join(CORE_KEY_DELIM)}${CORE_UNICODE_DELIM}`;
    }

    return `${SECTION_DELIM}${pattern}${SECTION_DELIM}${keys}`;
}

/**
 * Convert key from consumable text to JavaScript object.
 * @param {*} key Key as consumable text.
 * @returns 
 */
function decode_key(key) {
    const section = key.split(SECTION_DELIM);
    const core = section[2].split(CORE_UNICODE_DELIM);
    const pattern = section[1].split(PATTERN_DELIM);

    let keyf = {
        core: [],
        pattern: []
    };

    for (let i = 0; i < pattern.length; i++) {
        keyf.pattern.push(pattern[i].split(""));
    }
    
    for (let i = 0; i < core.length; i++) {
        keyf.core.push({cycles: core[i].split(CORE_KEY_DELIM)});
    }

    keyf.core.pop();

    return keyf;
}

/**
 * Advances the pattern of @char to the next iteration.
 * @param {*} table Cache table.
 * @param {*} key 
 * @param {*} char Select char.
 */
function advance_lookup_table(table, key, char) {
    for (let i = 0; i < table.length; i++) {
        const pat = table[i];
        if (i+MIN_ASCII === char.charCodeAt(0)) {
            const pattern = key.pattern[i];
            const next = pattern.indexOf(pat)+1;

            if (next >= pattern.length) {
                TOTAL_RESETS++;
                table[i] = pattern[0];
            } else table[i] = pattern[next];
            TOTAL_ADVANCEMENTS++;
        }
    }
}

/**
 * Obtain ID from char.
 * @param {*} table 
 * @param {*} key 
 * @param {*} char 
 * @returns 
 */
function search_lookup_table(table, key, char) {
    for (let i = 0; i < table.length; i++) {
        const pat = table[i];
        if (i+MIN_ASCII === char.charCodeAt(0)) {
            TOTAL_CACHE_READS++;
            const index = key.core[i].cycles[pat];

            if (!index) {
                console.error(`Error: A fatal encryption error has occurred, please try again.`);
                process.exit(1);
            }

            return index;
        }
    };
}

/**
 * Encrypt raw text with valid key.
 * @param {*} text 
 * @param {*} raw_key 
 * @returns Encrypted text.
 */
function encrypt(text, raw_key) {

    let key = "";

    try {
        key = decode_key(raw_key);
    } catch (_) {
        console.error("Error: Malformed key.");
        return;
    }

    let buffer = ""

    let table = [];

    for (let i = 0; i < ASCII_RANGE; i++) {
        table.push(key.pattern[i][0]);
    }

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char.charCodeAt(0) > MIN_ASCII && char.charCodeAt(0) < MAX_ASCII) {
            const id = search_lookup_table(table, key, char);
            
            buffer += id;
            advance_lookup_table(table, key, char);
        } else buffer += char;
    }

    return buffer;
}

/**
 * Decrypt encrypted text with valid key.
 * @param {*} text 
 * @param {*} raw_key 
 * @returns Decrypted text.
 */
function decrypt(text, raw_key) {
    /*The decrypter doesn't need to use the pattern system.*/

    const replaceAll = (str, search, replace) => { 
        return str.split(search).join(replace); 
    }

    let key = "";

    try {
        key = decode_key(raw_key);
    } catch (_) {
        console.error("Error: Malformed key.");
        return;
    }

    let buffer = text;

    for (let i = 0; i < key.core.length; i++) {
        const cycles = key.core[i].cycles;
        for (let j = 0; j < cycles.length; j++) { 
            buffer = replaceAll(buffer, cycles[j], String.fromCharCode(i+MIN_ASCII));
        }
    }

    return buffer
}

async function prompt_or_read(initial, prompt_in, file) {
    console.log(initial);
    let key = prompt(prompt_in);

    if (!key) {
        try {
            key = await Deno.readTextFile(file);
        } catch(_) {
            console.error(`Error: '${file}' could not be read, ensure that the file was not deleted or moved.`);
        }    
    } 
}

if (Deno.args.length > 0) {
    switch(Deno.args[0]) {
        case "help":
            console.log("Quick command arguments:");
            console.log("key: generates a new key, writes it to KEY.txt, and prints it to the command line.");
            console.log("enc <?text>: Encrypts text based on the key in KEY.txt. if @text is provided, it will encrypt that text, otherwise it will encrypt the text in INPUT.txt and write it to OUTPUT.txt as well as the command line.");
            console.log("dec <?text>: Decrypts text based on the ket in KEY.txt and the text in INPUT.txt, writes it to the command line and OUTPUT.txt.");
            console.log("keyc: Converts the key in KEY.txt into JSON and writes it to OUTPUT.txt.");
            break;

        case "key":
            const gen = encode_key(generate_key(9));
            await Deno.writeTextFile("KEY.txt", gen);
            console.log(gen);
            break;

        case "enc":
            let input_enc = "";

            if (Deno.args.length > 1) {
                input_enc = Deno.args.slice(1).join(" ");
            } else {
                input_enc = await Deno.readTextFile("INPUT.txt");
            }

            const key_enc = await Deno.readTextFile("KEY.txt");
            const out_enc = encrypt(input_enc, key_enc);

            await Deno.writeTextFile("OUTPUT.txt", out_enc);
            console.log(out_enc);            
            break;

        case "dec":
            let input_dec = "";

            if (Deno.args.length > 1) {
                input_dec = Deno.args.slice(1).join(" ");
            } else {
                input_dec = await Deno.readTextFile("INPUT.txt");
            }

            const key_dec = await Deno.readTextFile("KEY.txt");
            const out_dec = decrypt(input_dec, key_dec);
    
            await Deno.writeTextFile("OUTPUT.txt", out_dec);
            console.log(out_dec);            
            break;

        case "keyc":
            const key_keyc = await Deno.readTextFile("KEY.txt");
            const decoded_js_key = decode_key(key_keyc);
            await Deno.writeTextFile("OUTPUT.txt");
            break;

        default:
            console.error("Unexpected option.");
            break;
    } Deno.exit(0);
}

console.log("Welcome to the encryption program.");
console.log("Use the help option to see quick commands.");
console.log("Would you like to:\nA) Encrypt text.\nB) Decrypt text.\nC) Generate a key.\nD) Convert a key into JSON form.");
while (1) {
    const input = prompt("> ")?.toLowerCase();

    switch (input) {
        case 'a':
            let key = await prompt_or_read("Paste your key or write the key into 'KEY.txt' and hit enter on the command line.", "Key:", "KEY.txt");
            let text = await prompt_or_read("Write text or write the text into 'INPUT.txt' and hit enter on the command line.", "Text", "INPUT.txt");

            console.log( encrypt(text, key) );
            break;
        case 'b':
            let keyd = await prompt_or_read("Paste your key or write the key into 'KEY.txt' and hit enter on the command line.", "Key:", "KEY.txt");
            let textd = await prompt_or_read("Write encrypted text or write the text into 'INPUT.txt' and hit enter on the command line.", "Text", "INPUT.txt");

            console.log( decrypt(textd, keyd) );
            break;
        case 'c':
            console.log( decode_key(generate_key(9)) );
            break;
        case 'd':
            let keydd = await prompt_or_read("Paste your key or write the key into 'KEY.txt' and hit enter on the command line.", "Key:", "KEY.txt");
            console.log(JSON.stringify(decode_key(keydd)));
            break;
    }
}
