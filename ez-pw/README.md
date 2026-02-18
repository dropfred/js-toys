# Strong passwords generation bookmarklet

_Warning: The UI is quite ugly. Doing nice UI in a bookmarklet is somewhat hard to achieve, since it is affected by the hosting page's styles. I may rework on it someday, but it is unlikelly since it is not my main concern._

The purpose of this bookmarklet is to easily generate strong passwords.

In a nutshell, it takes two strings, concatenates them and hashes (SHA-256) the result to get a password.

The idea is that you are able to generate (and more importantly, regenerate) strong passwords using easy to remember name/password pairs. The name isn't very sensible and can be stored somewhere for convenience, and the password part may be unique and should be stored in your head only.

String are in Unicode, so you can type any text in any language, including emoticons. As an example, assuming defaults settings are used:

- `personal 📧` and `😈 my evil password 😈` generate `2*$XD@0u09mbDzPk`.
- `professional 📧` and the same password as above generate `gWGdGQ8poO_5c-36`.

You can change all the passwords by changing the salt option and keeping all name/password pairs. As an example, using the `abcd` salt with the same name/password pairs above generates `V1Gh3!3TtDgv-LMG` and `e@3Vh9I9sGtE!R9v` passwords.

The bookmarket comes in two flavors, the basic one being a simplified version of the other, without password field emulation. It means that the entered text appears as regular text, not dotted text. Password field emulation is required because using regular password fields confuses the browser's password manager. I have tried several workarounds, and none is plainly satisfactory. I ended up with the astute [noppa/text-security solution](https://github.com/noppa/text-security), but even this doesn't always work because some sites refuse embeded font, and it has some minor issues regarding text baseline when changing a text field from dotted font to regular font.

## Usage

When clicked, the bookmarket shows three text fields at the top of the page, two for input, one for output. The bookmarket is closed by clicking it again or by pressing the Escape key. Depending of the options of the bookmarklet, the generated password can be automatically copied to the clipboard and to the page's password field.

## Install

To install the bookmarklet, select the text in the first line of the selected source (it is the minimized source file itself), and drag it to your bookmarks. I couldn't find a way to embed a javascript link in this page, it seems that Github prohibits it.

There is no UI to customize the password generation, but you can tweak the bookmarklet by editing it. To do that, modify the link at the end, and put the options you want. Possible options are:

- `size`: Length of the generated password, defaults to 16, can be from 4 to 26.
- `copy`: If `true`, the generated password is copied to the clipboard, defaults to `false`.
- `fill`: If `true`, the generated password is copied to the page's password field (if present and unique), defaults to `false`.
- `hide`: If `true`, the page is hidden during the bookmarlet's execution, defaults to `false`.
- `syms`: Symbols used to generate the password, defaults to `&#@$*=!_+-`.
- `salt`: Additionnal text used to generate the password, defaults to the empty string.

As an example, if you want to generate 20 characters long password, and automatically fill the page's password field, your should change the bookmarklet from `javascript:...({})` to `javascript:...({size:20,fill:true})`.

## Caveats

- The password emulation works quite poorly, I personally prefer to use the basic version.
- Depending of the styles used by the hosting page, the bookmarklet may not be displayed correctly (or even not displayed at all). In this case, the `hide` option may help.
- Some sites require a very limited set of symbols, use the `syms` option in this case.
- Tested against Chrome desktop and Firefox desktop only, doesn't work on mobile browsers.
