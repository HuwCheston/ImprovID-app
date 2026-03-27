let player = document.getElementById("mplayer");
// player.addEventListener("load", _playHandler);
//
//
// function _playHandler() {
//     player.stop();
//     player.currentTime = 0.0;
//     player.start();
// }

function getConceptColor(index) {
    if (index === 0) {
        return "#ff0000ff"
    } else if (index === 1) {
        return "#00ff00ff"
    } else if (index === 2) {
        return "#0000ffff"
    } else if (index === 3) {
        return "#ff9900ff"
    } else {
        return "#f0f0f0"
    }
}

function getConceptName(index) {
    if (index === 0) {
        return "melody"
    } else if (index === 1) {
        return "harmony"
    } else if (index === 2) {
        return "rhythm"
    } else {
        return "dynamics"
    }
}

function fmtPianistName(pianist) {
    return pianist.toLowerCase().replace(' ', '_')
}

function updateConcept(index, pianist, prediction_acc) {
    let tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active-tab'));
    tabs.forEach(tab => tab.style.background = "#f0f0f0");
    tabs.forEach(tab => tab.style.border = "2px solid #ccc")
    tabs[index].classList.add('active-tab');
    tabs[index].style.background = getConceptColor(index);

    let iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => iframe.classList.remove('active'));
    document.getElementById('plot' + (index + 1)).classList.add('active');

    let concept = getConceptName(index)
    let pianist_fmt = fmtPianistName(pianist)
    player.src = `../../assets/midi/style_examples/${pianist_fmt}_${concept}.mid`

    // document.getElementById('choose-a-concept').innerText = "Similar Pianists"
    let innerText = `Click to play ${pianist}'s most distinctive use of ${concept}`
    if (typeof prediction_acc !== "undefined") {
        innerText = `${innerText} (${prediction_acc}% confidence)`
    }

    document.getElementById("yaxis-text").innerText = `Similar to ${pianist}'s ${concept}`

    document.getElementById('click-to-play').innerText = innerText
    document.getElementById('click-to-play').style.visibility = 'visible'
    document.getElementById('play-button').style.visibility = 'visible'
    document.getElementById('stop-button').style.visibility = 'visible'

    // show the links to melodic patterns
    let selector = document.getElementById("melodic-pattern-link")
    if (index === 0) {
        selector.style["visibility"] = "visible"
    }
    else {
        selector.style["visibility"] = "hidden"
    }
    selector.innerText = `Click to show ${pianist}'s most distinctive melodic patterns`
}

/**
 * Show the info popup
 */
function showInfoPopup() {
    document.getElementById('popupTitle').innerText = name;
    document.getElementById('popup').style.display = 'block';
    // document.getElementById('grid-container').style.display = 'block';
    ["grid-container", "page-title", "return-button", "info-button"].forEach(fn => {
        document.getElementsByClassName(fn)[0].classList.add('blurred');
    });
    ["return-button", "info-button"].forEach(btn => {
        document.getElementsByClassName(btn)[0].disabled = true
    })
}

/**
 * Close the info popup
 */
function closeInfoPopup() {
    document.getElementById('popup').style.display = 'none';
    // document.getElementById('overlay').style.display = 'none';
    ["grid-container", "page-title", "return-button", "info-button"].forEach(fn => {
        document.getElementsByClassName(fn)[0].classList.remove('blurred');
    });
    ["return-button", "info-button"].forEach(btn => {
        document.getElementsByClassName(btn)[0].disabled = false
    })
}

function backToSelection() {
    window.location.href = '../../index.html?noIntro=true';
}

function playTrack() {
    if (player.playing) {
        stopTrack()
    }
    else {
        player.start()
        document.getElementById('play-button').style.background = 'green'
    }
}

function stopTrack() {
    player.stop()
    document.getElementById('play-button').style.background = 'lightblue'
}

function toMelodyPage() {
    window.location.href = window.location.href.replace("/style/", "/melody/");
}