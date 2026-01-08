let handPose;
let video;
let hands = [];
let fistWasClosed = false;
let balls = [];
let ballNumber = 5;
let dragging = false;
let dragSetX = 0;
let dragSetY = 0;
let draggedBallIndex = -1;
let score = 0;
let life = 5;
let roundsPlayed = 0;
let boolGameOver = false;
let currentWaveChickens = 0;
let chickensReachedCoop = 0;
let chickensCaptured = 0;
let chickenSpeed = 1;
let ultimateCharge = 0; // 5 poules capturées = 1 ultime 
let targetedChicken = null; // Poule actuellement visée
let smoothHandX = 0;
let smoothHandY = 0;
let showRoundComplete = false;
let roundCompleteTimer = 0;
let closestBallIndex = -1;

function preload() {
  // Load the handPose model 
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight); // Create the webcam video and hide it 
  video = createCapture(VIDEO);
  video.size(windowWidth, windowHeight)
  video.hide(); // start detecting hands from the webcam video 
  handPose.detectStart(video, gotHands);
  smoothHandX = width / 2;
  smoothHandY = height / 2; // Démarrer la première vague 
  startNewRound();
}

function draw() {
  background(30, 30, 50);
  fill(100, 255, 100, 50);
  noStroke();
  rect(0, 0, 150, height);
  if (hands.length === 0) {
    fistWasClosed = false;
    dragging = false;
    draggedBallIndex = -1;
    closestBallIndex = -1;
  }
  if (hands.length > 0) {
    let hand = hands[0];
    let sumX = 0;
    let sumY = 0;
    for (let k = 0; k < hand.keypoints.length; k++) {
      sumX += hand.keypoints[k].x;
      sumY += hand.keypoints[k].y;
    }
    let handX = width - (sumX / hand.keypoints.length);
    let handY = sumY / hand.keypoints.length;
    smoothHandX = lerp(smoothHandX, handX, 0.5);
    smoothHandY = lerp(smoothHandY, handY, 0.5);
    let fistDetected = isFist(hand);

    if (fistDetected && !fistWasClosed) {
      fistWasClosed = true;


      closestBallIndex = -1;
      let bestDist = Infinity;

      for (let idx = 0; idx < balls.length; idx++) {
        let ball = balls[idx];

        if (ball.type === 2 && ball.armor > 0) continue;

        if (isHandTouchingBall(hand, ball)) {
          let d = dist(handX, handY, ball.x, ball.y);
          if (d < bestDist) {
            bestDist = d;
            closestBallIndex = idx;
          }
        }
      }

      if (closestBallIndex >= 0) {
        dragging = true;
        draggedBallIndex = closestBallIndex;

        let ball = balls[closestBallIndex];
        dragSetX = ball.x - handX;
        dragSetY = ball.y - handY + 30;
      }
    }

    if (fistDetected && dragging && draggedBallIndex >= 0) {
      let ball = balls[draggedBallIndex];
      let targetX = handX + dragSetX;
      let targetY = handY + dragSetY;
      ball.x = lerp(ball.x, targetX, 0.8);
      ball.y = lerp(ball.y, targetY, 0.8);
    }
    if (!fistDetected) {
      fistWasClosed = false;
      dragging = false;
      draggedBallIndex = -1;
    }
    push();
    translate(width, 0);
    scale(-1, 1);
    if (fistDetected && dragging) {
      fill(255, 100, 100);
    } else if (fistDetected) {
      fill(255, 200, 100);
    } else {
      fill(100, 200, 255);
    }
    noStroke();
    circle(width - smoothHandX, smoothHandY, 40);
    stroke(255);
    strokeWeight(2);
    line(width - smoothHandX - 10, smoothHandY, width - smoothHandX + 10, smoothHandY);
    line(width - smoothHandX, smoothHandY - 10, width - smoothHandX, smoothHandY + 10);
    pop();
  }

  for (let i = balls.length - 1; i >= 0; i--) {
    let ball = balls[i];
    if (!dragging || balls[draggedBallIndex] !== ball) {
      ball.x += ball.speed;
      if (ball.x > width + 200) {
        ball.x = 150;
      }
    }
  }
  for (let i = balls.length - 1; i >= 0; i--) {
    let ball = balls[i];

    if (ball.x > width - 100 && dragging && draggedBallIndex === i) {
      captureChicken(ball);
      balls.splice(i, 1);

      if (draggedBallIndex === i) {
        dragging = false;
        draggedBallIndex = -1;
      } else if (draggedBallIndex > i) {
        draggedBallIndex--;
      }
      continue;
    }
    noFill();
    if (ball === targetedChicken) {
      stroke(255, 0, 0, 200);
      strokeWeight(4);
    } else {
      stroke(255, 255, 0, 100);
      strokeWeight(2);
    }
    circle(ball.x, ball.y, ball.r * 2);
    noStroke();
    fill(ball.color[0], ball.color[1], ball.color[2]);
    circle(ball.x, ball.y, ball.r);
    if (ball.armor && ball.armor > 1) {
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(20);
      text(ball.armor, ball.x, ball.y);
    }
  }
  // Afficher le score et les vies 
  fill(255);
  textSize(20);
  textAlign(LEFT);
  text('Score: ' + score, 20, 30);
  text('Vies: ' + life, 20, 60);
  text('Manches: ' + roundsPlayed, 20, 90);
  text('Ultime: ' + ultimateCharge + '/5', 20, 120);
  push();
  translate(120, 140);
  scale(-1, 1);

  if (hands.length > 0) {
    let hand = hands[0];
    let scaleX = 100 / width;
    let scaleY = 80 / height;
    for (let j = 0; j < hand.keypoints.length; j++) {
      let keypoint = hand.keypoints[j];
      let x = keypoint.x * scaleX;
      let y = keypoint.y * scaleY;
      fill(0, 255, 0);
      noStroke();
      circle(x, y, 5);
    }
  }
  pop();
  noStroke();
  if (showRoundComplete) {
    fill(0, 0, 0, 200);
    rect(0, 0, width, height);
    fill(255, 255, 255);
    textAlign(CENTER, CENTER);
    textSize(50);
    text('MANCHE ' + roundsPlayed + ' TERMINÉ!', width / 2, height / 2 - 50);
    textSize(30);
    text('Score: ' + score, width / 2, height / 2 + 20);
    text('Vies: ' + life, width / 2, height / 2 + 60);
    textSize(20);
    text('Appuyez sur ESPACE pour continuer', width / 2, height / 2 + 120);
    roundCompleteTimer++;
    if (roundCompleteTimer > 120) {
      showRoundComplete = false;
      roundCompleteTimer = 0;
      startNewRound();
    }
    return;
  }
  // // Game over si plus de vies // if (boolGameOver) { // textAlign(CENTER); // textSize(40); // fill(255, 0, 0); // text('GAME OVER', width/2, height/2); // textSize(20); // text('Appuyez sur ... pour recommencer', width/2, height/2 + 40); // } 
}
// Callback function for when handPose outputs data 
function gotHands(results) { // save the output to the hands variable 
  hands = results;
}

function isFist(hand) {
  const wrist = hand.keypoints[0];
  const tips = [hand.keypoints[8], hand.keypoints[12], hand.keypoints[16], hand.keypoints[20]];
  let sum = 0;
  for (let tip of tips) {
    sum += dist(wrist.x, wrist.y, tip.x, tip.y);
  }
  let avgDistance = sum / tips.length;
  return avgDistance < 120;
}

function isHandTouchingBall(hand, ball) {
  let detectionRadius = ball.r * 2;

  for (let i = 3; i < hand.keypoints.length; i++) {
    let keypoint = hand.keypoints[i];
    let keypointX = width - keypoint.x;
    let keypointY = keypoint.y;
    if (dist(keypointX, keypointY, ball.x, ball.y) < detectionRadius) {
      return true;
    }
  }
  return false;
}

function startNewGame() {
  score = 0;
  life = 5;
  roundsPlayed = 0;
  boolGameOver = false;
  ultimateCharge = 0;
  targetedChicken = null;
  balls = [];
  // Démarrer la première vague 
  startNewRound();
}

function startNewRound() {
  // Supprimer les poules de la vague précédente
  balls = [];
  chickensReachedCoop = 0;
  chickensCaptured = 0;
  currentWaveChickens = ballNumber;
  chickenSpeed = 0.5;
  for (let i = 0; i < ballNumber; i++) {
    let y = height / 3;
    let x = 150 + (i * 300);
    let chance = random(100);
    let ballType;
    if (chance < 70) {
      ballType = 0;
    } else if (chance < 80) {
      ballType = 1;
    } else {
      ballType = 2;
    }
    let ball = {
      x: x,
      y: y,
      type: ballType,
      speed: chickenSpeed
    };
    if (ballType === 0) {
      ball.r = random(80, 100);
      ball.color = [255, 0, 0];
      ball.points = 1;
    } else if (ballType === 1) {
      ball.r = random(80, 100);
      ball.color = [255, 255, 0];
      ball.points = 2;
    } else {
      ball.r = random(80, 100);
      ball.color = [100, 150, 255];
      ball.points = 3;
      ball.armor = 2;
    }
    balls.push(ball);
  }
}
// Fonction à appeler quand une poule atteint le poulailler
function chickenReachedCoop() {
  chickensReachedCoop++;
  // Si toutes les poules ont atteint le poulailler = défaite 
  if (chickensReachedCoop >= currentWaveChickens) {
    endRound(false);
    startNewRound();
  }
}
// Fonction à appeler quand une poule est capturée 
function captureChicken(ball) {
  if (ball && ball.armor && ball.armor > 1) {
    ball.armor--;
    return;
  }
  chickensCaptured++;
  let points = ball && ball.points ? ball.points : 1;
  score += points; // Charger l'ultime (max 5) if (ultimateCharge < 5) { ultimateCharge++; if (ball && ball.type === 1) { ultimateCharge++; } } 
  // // Si toutes les poules sont capturées = victoire 
  if (chickensCaptured >= currentWaveChickens) {
    endRound(true);
    showRoundComplete = true;
  }
}
// Fonction pour tirer sur une poule casquée ciblée 
function shootTargetedChicken() {
  // TODO: Vérifier si une poule casquée est ciblée via détection main // Si targetedChicken existe et est casquée: // - Retirer le casque ou détruire la poule // - captureChicken(); // - targetedChicken = null;
  console.log('Tir sur poule casquée ciblée');
}

// Fonction pour activer l'ultime (onde de choc)
function activateUltimate() {
  if (ultimateCharge >= 5) {
    // TODO: Étourdir toutes les poules en mouvement // Pour chaque poule: // - Arrêter son mouvement temporairement (stunned = true) // - Ajouter animation d'étourdissement // - Après quelques secondes, reprendre le mouvement
    ultimateCharge = 0; // Consommer l'ultime 
    console.log('ULTIME ACTIVÉ - Onde de choc!');
  } else {
    console.log('Ultime pas encore chargé: ' + ultimateCharge + '/5');
  }
}

function endRound(won) {
  roundsPlayed++;
  if (!won) {
    life--;
    if (life <= 0) {
      boolGameOver = true;
    }
  } // Récupérer toutes les vies toutes les 5 manches 
  if (roundsPlayed % 5 === 0) {
    life = 5;
  }
}

function keyPressed() { // Ultime: flèche droite + flèche gauche simultanément // if (kb.pressing('ArrowLeft') && kb.pressing('ArrowRight')) { // activateUltimate(); // return; // }
  if (key === ' ') {

    if (showRoundComplete) {
      showRoundComplete = false;
      roundCompleteTimer = 0;
      startNewRound();
      return;
    }
    // Si game over, recommencer 
    if (boolGameOver) {
      startNewGame();
      return;
    }
    for (let i = 0; i < balls.length; i++) {
      if (balls[i].type === 2) {
        balls[i].type = 0;
        balls[i].color = [255, 0, 0];
        balls[i].points = 1;
        delete balls[i].armor;
        break;
      }
    }
  }
}