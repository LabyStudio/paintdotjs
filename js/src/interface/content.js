let title = document.getElementById('title');
title.innerHTML += " v" + window.appVersion + " " + (isApp ? "App" : "Web");

let canvas = document.getElementById('canvas');
let context = canvas.getContext('2d');

render();
document.addEventListener('resize', () => {
    render();
});

function render() {
    let bounds = canvas.getBoundingClientRect();
    let width = bounds.width;
    let height = bounds.height;

    canvas.width = width;
    canvas.height = height;

    let centerX = width / 2;
    let centerY = height / 2;

    let rectWidth = width / 2;
    let rectHeight = height / 1.2;

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'white';
    context.fillRect(
        centerX - rectWidth / 2,
        centerY - rectHeight / 2,
        rectWidth,
        rectHeight
    );
}