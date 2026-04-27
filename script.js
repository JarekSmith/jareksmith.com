const audio = new Audio("music/Strong and Strike.mp3");

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("player").addEventListener("click", playMusic);
    const canvasElement = document.getElementById("canvas-element");
    const context = canvasElement.getContext("2d");
    
    const ratio = getRatio();
    context.fillStyle = "blue";
    context.fillRect(0, 0, 1000 * ratio, 90.8);

    const currentTime = new Date();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementsByClassName("timestamp")[0].innerText = `${months[currentTime.getMonth()]} ${currentTime.getDate()}, ${currentTime.getFullYear()} | ${(getRatio()*100).toFixed(2)}%`;
})

const getRatio = () => {
    const first = new Date(2026, 0, 18).valueOf();
    const last = new Date(2027, 6, 21).valueOf();
    const current = new Date().valueOf();
    return (current - first) / (last - first);
}

const playMusic = () => {
    if (audio.paused) audio.play();
    else audio.pause();
}