// TODO
//
// PHYSICAL:
// -At least one digital/analog input
// -At least one digital/analog output

const GameState = {
  Start: "Start",
  Playing: "Playing",
  GameOver: "GameOver"
};

let game = { rotation: 0, score: 0, maxScore: 0, maxTime: 10, elapsedTime: 0, state: GameState.Start };

let timeDec = 0.125;
let lineSpeed = 2;
let menuLockUnlocked = true;
let menuTime = 0;
let greenVal = 180, blueVal = 255;

// SOUND
const poly = new Tone.PolySynth().toDestination();
const duo = new Tone.DuoSynth().toDestination();
const mono = new Tone.MonoSynth().toDestination();

let sounds = new Tone.Players({
  "win": "sounds/win.mp3",
  "lose": "sounds/lose.mp3",
})

const delay = new Tone.FeedbackDelay("8n", 0.5);

let soundNames = ["win", "lose"];

// ARDUINO
let sensorData;
let reader;

function setup() {
  createCanvas(600, 600);
  imageMode(CENTER);
  
  sounds.connect(delay);
  delay.toDestination();
  
  reset();

  toggleMenu();

  if ("serial" in navigator) {
    // The Web Serial API is supported
    connectButton = createButton("connect");
    connectButton.position(10, 10);
    connectButton.mousePressed(connect);
  }
}

function reset() {
  // Reset variables to start game again
  game.maxTime = 10;
  game.elapsedTime = 0;
  game.score = 0;
  game.rotation = 0;

  locks = [];
  let h = 300, k = 300, r = 200;
  for (let i = 0; i < 50; i++) {
    let degrees = random(0,360);
    let x = h + r * (cos(degrees * PI/180));
    let y = k + r * -(sin(degrees * PI/180));

    locks[i] = new Lock(x, y, degrees);
  }
  player = new Player();
}

function playSound(sound) {
  sounds.player(sound).start();
}

function toggleMenu() {
  var menuSeq = new Tone.Sequence(function (time, note) {
    mono.triggerAttackRelease(note, .12, time);
  }, [
    ["C4", "D4"], "D3", "D3" , "D3", "D2", "D3", "D2", "D1",
  ], "8n");
  var menuSeq2 = new Tone.Sequence(function (time, note) {
    duo.triggerAttackRelease(note, .12, time);
  }, [
    "D2", ["C2", "E2"]
  ], "2n");
  var menuSeq3 = new Tone.Sequence(function (time, note) {
    poly.triggerAttackRelease(note, .12, time);
  }, [
    ["G4", "A4"], ["G4", "A4"], ["A4"], "B5"
  ], "4n");

  mono.volume.value = -10;
  duo.volume.value = -15;
  poly.volume.value = -10;

  if (Tone.Transport.state == "started") {
    menuSeq.stop();
    menuSeq2.stop();
    menuSeq3.stop();
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
  } else {
    Tone.start();
    menuSeq.start(0);
    menuSeq2.start(1/4);
    menuSeq3.start(0);
    Tone.Transport.start();
  }
}

function togglePlay() {
  var playSeq = new Tone.Sequence(function (time, note) {
    mono.triggerAttackRelease(note, .12, time);
  }, [
    "C2", "B1"
  ], "2n");

  var playSeq2 = new Tone.Sequence(function (time, note) {
    poly.triggerAttackRelease(note, .12, time);
  }, [
    "C2", ["A1", "B1"], "B1", "E2", "D2", "D2#", "C2", "A1",
    "C2", ["A1", "B1"], "B1", "E2", "D2", "D2#", "C2", null
  ], "4n");

  mono.volume.value = -5;
  poly.volume.value = 8;

  if (Tone.Transport.state == "started") {
    playSeq.stop();
    playSeq2.stop();
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
  } else {
    Tone.start();
    playSeq.start(0);
    playSeq2.start(4);
    Tone.Transport.start();
  }
}

function draw() {
  switch (game.state) {
    case GameState.Start:
      background(0, 180, 255);

      // Lock
      push();
      fill(0);
      arc(300, 300, 165, 250, PI, TWO_PI);
      fill(0, 180, 255);
      arc(300, 300, 115, 200, PI, TWO_PI);
      
      // Lock unlock
      push();
      menuTime += deltaTime/1000;
      if (round(menuTime) % 2 == 0) {
        menuLockUnlocked = true;
      } else {
        menuLockUnlocked = false;
      }
      fill(0, 180, 255);
      if (menuLockUnlocked) {
        noStroke();
        rect(215, 245, 50, 50);
      }
      pop();

      // Lock body
      fill(255, 204, 0);
      ellipse(300, 350, 200);
      fill(0);
      ellipse(300, 350, 40);
      triangle(300, 350, 275, 400, 325, 400);
      pop();

      // Title Text
      push();
      stroke(0);
      strokeWeight(3);
      fill(255);
      textSize(50);
      textAlign(CENTER);
      text("Pop-A-Lock", 300, 100);
      textSize(30);
      text("Press enter to start!", 300, 525);
      pop();

      if (keyIsDown(ENTER)) {
        toggleMenu();
        togglePlay();
        game.state = GameState.Playing;
      }

      break;
    case GameState.Playing:
      background(0, greenVal, blueVal);

      serialRead();

      // Display score
      fill(0);
      textSize(40);
      text(game.score, 20, 40);

      // Display time
      let currentTime = game.maxTime - game.elapsedTime;
      text(ceil(currentTime), 540, 40);
      game.elapsedTime += deltaTime/1000;

      // Draw current lock
      locks[game.score].draw();

      // Draw the lock itself
      push();
      fill(0);
      arc(300, 150, 350, 350, PI, TWO_PI);
      fill(0, greenVal, blueVal);
      arc(300, 150, 275, 275, PI, TWO_PI);
      fill(255, 204, 0);
      ellipse(300, 300, 500);
      push();
      fill(100);
      ellipse(300, 300, 450);
      pop();
      ellipse(300, 300, 350);
      pop();

      // Draw Player Line
      player.draw();

      // Check for input
      let contains = locks[game.score].contains(game.rotation);
      if (contains) {
        blueVal = 0;
        greenVal = 255;
        // Insert light here
        if (keyIsDown(UP_ARROW)) {
          game.score += 1;
          game.elapsedTime = 0;
          game.maxTime = game.maxTime - timeDec;
        }
      } else {
        blueVal = 255;
        greenVal = 180;
      }

      // Loss condition
      if (currentTime < 0) {
        game.state = GameState.GameOver;
        playSound("lose");
      }

      // Win condition
      if (game.score >= 50) {
        game.state = GameState.GameOver;
        playSound("win");
      }
      break;
    case GameState.GameOver:
      game.maxScore = max(game.score, game.maxScore);

      background(0, 180, 255);

      push();
      stroke(0);
      strokeWeight(3);
      fill(255);
      textSize(60);
      textAlign(CENTER);
      text("Game Over!", 300, 300);
      textSize(55);
      text("Score: " + game.score, 300, 370);
      text("Max Score: " + game.maxScore, 300, 430);
      pop();

      if (keyIsDown(ENTER)) {
        reset();
        toggleMenu();
        game.state = GameState.Start;
      }
      break;
  }
}

async function serialRead() {
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      reader.releaseLock();
      break;
    }
    sensorData = value;
  }
}


async function connect() {
  port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });

  reader = port.readable.pipeThrough(new TextDecoderStream()).pipeThrough(new TransformStream(new LineBreakTransformer())).getReader();
}

class Player {
  draw() {
    // Line to rotate
    let v1 = createVector(width / 2, height / 2);
    let v2 = createVector(width / 2 + 200, height / 2);

    // Draw line
    push();
    stroke(0);
    strokeWeight(10);
    translate(v1.x, v1.y);
    if (keyIsDown(LEFT_ARROW)) {
      game.rotation += lineSpeed;
    } else if (keyIsDown(RIGHT_ARROW)) {
      game.rotation -= lineSpeed;
    }
    if (game.rotation < 0) {
      game.rotation = 360;
    } else if (game.rotation > 360) {
      game.rotation = 0;
    }
    game.rotation = sensorData;
    rotate(-game.rotation * (PI/180));
    translate(-v1.x, -v1.y);
    let r0 = line(v1.x, v1.y, v2.x, v2.y);
    strokeWeight(75);
    let p1 = point(v1.x, v1.y);
    pop();
  }
}

class Lock {
  constructor(dx, dy, dr) {
    this.dx = dx;
    this.dy = dy;
    this.dr = dr;
  }

  draw() {
    push();
    fill(255, 255, 80);
    ellipse(this.dx, this.dy, 50);
    pop();
  }

  contains(r) {
    let min = this.dr - 8, max = this.dr + 8;
    let insideR;
    if (min <= 0) {
      min += 360;
      insideR = r >= min || r <= max;
    } else if (max >= 360) {
      max -= 360;
      insideR = r >= min || r <= max;
    } else {
      insideR = r >= min && r <= max;
    }
    return insideR;
  }
}

class LineBreakTransformer {
  constructor() {
    this.chunks = "";
  }

  transform(chunk, controller) {
    this.chunks += this.chunk;
    const lines = this.chunks.split("\n");
    this.chunks = lines.pop();
    lines.forEach((line) => controller.enqueue(line));
  }

  flush(controller) {
    controller.enqueue(this.chunks);
  }
}