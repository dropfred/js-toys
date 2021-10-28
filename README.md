# js-toys

Javascript toys.

## nbody

![](screenshots/n-body_1.jpg) ![](screenshots/n-body_2.jpg)

_Note: this toy is outdated, see nbody_revisited below._

[live](https://dropfred.github.io/js-toys/nbody/index.html)

Mesmerizing N-body (kind of) toy simulation. Depending of your computer, you may need to reduce the number of bodies in order to have a fluid animation, if too many bodies the animation may be totally stuck.

Interactions between species are random, and some sets are more fun than others. Also, playing with the window size may give some fun results.

## nbody_revisited

![](screenshots/n-body_revisited_1.jpg) ![](screenshots/n-body_revisited_2.jpg) ![](screenshots/n-body_revisited_3.jpg)

_Note: this toy requires WebGL 2 for OpenGL ES 3 transform feedback, plus the EXT_color_buffer_float and EXT_float_blend extensions. Extensions are needed because integer textures cannot be blended (even simply added), and float textures cannot be rendered._

_Note 2: this is a work in progress, and some features are missing. In particular, bodies can currently overlap, which should ideally be forbidden._

[live](https://dropfred.github.io/js-toys/nbody_revisited/index.html)

Retake on the n-body toy.

Although the initial n-body simulation is quite funny, the very limited number of bodies involved is frustrating. The two main reasons for that is, first the naive brute force approach with n^2 complexity, and second the fact that drawing to the canvas using the 2d renderer actually takes a lot of time. So I decided to test another approach using WebGL 2. The simulation now runs entirely on the GPU, and the complexity is linear. On a computer with a decent graphic card, depending on the settings, more than 300,000 bodies can be simulated at 60 fps, with nearly 0% CPU utilization. Also, it now comes with a lot more parameters to play with.

## orbit

![](screenshots/orbit_1.jpg) ![](screenshots/orbit_2.jpg)

[live](https://dropfred.github.io/js-toys/orbit/index.html)

Solar system orbits from planets point of view. Originally written using canvas 2d rendering, but end up using WebGL since I couldn't figure out how to trace nice long trails otherwise.

_Disclaimer: This is just a toy, not a realistic simulation. In particular, orbits are assumed circular, and all in the same plane. Also, sizes and distances are obvously not to scale, although relative sizes and distances of planets are approximately realistic (but not the ratio distance / size)._

## ez-pw

Easy password generator bookmarklet.

## gravity

Game embryo around gravity. The goal is to go from a place to another using gravity assistance.

## ants
