# js-toys

Javascript toys.

## nbody

![](screenshots/n-body_1.jpg) ![](screenshots/n-body_2.jpg)

_Note: this project is outdated, see nbody_revisited below._

[live](https://dropfred.github.io/js-toys/nbody/index.html)

Mesmerizing N-body (kind of) toy simulation. Depending of your computer, you may need to reduce the number of bodies in order to have a fluid animation, if too many bodies the animation may be totally stuck.

Interactions between species are random, and some sets are more fun than others. Also, playing with the window size may give some fun results.

## nbody_revisited

![](screenshots/n-body_revisited_1.jpg) ![](screenshots/n-body_revisited_2.jpg) ![](screenshots/n-body_revisited_3.jpg)

_Note: this toy requires WebGL 2, plus the EXT_color_buffer_float and EXT_float_blend extensions._

[live](https://dropfred.github.io/js-toys/nbody_revisited/index.html)

Retake on the n-body toy.

Although I find the initial n-body simulation quite funny, I am frustrated by the very limited number of bodies. The two main reasons for that is, first the brute force approach used with n^2 complexity, and second the fact that drawing to the canvas using the 2d renderer is quite slow. So I decided to test another approach using WebGL 2. The Simulation now runs entirely on the GPU (even the random initialization), and the complexity is now linear. On a computer with a decent graphic card, more than 300,000 bodies (that's about 100 billions potential interactions !) can now be simulated at 60 fps, with nearly 0% CPU utilization. Also, it now comes with a lot of parameters to play with.

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
