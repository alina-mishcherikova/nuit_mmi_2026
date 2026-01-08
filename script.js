let handPose;
let video;
let hands = [];
let fistWasClosed = false;
let balls = [];
let ballNumber=5;
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


function preload() {
  // Load the handPose model
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(800,800);
    // Create the webcam video and hide it
  video = createCapture(VIDEO);
  video.size(800, 800);
  video.hide();
  // start detecting hands from the webcam video
  handPose.detectStart(video, gotHands);
  
  // Démarrer la première vague
  startNewRound();
}

function draw() {
 
  push();
  translate(width, 0);
  scale(-1, 1);


  // Draw the webcam video
  image(video, 0, 0, width, height);

  

  if (hands.length === 0) {
    fistWasClosed = false;
    dragging = false;
    draggedBallIndex = -1;
  }
  
  if (hands.length > 0) {
    let hand = hands[0];
    for (let j = 0; j < hand.keypoints.length; j++) {
      let keypoint = hand.keypoints[j];
      fill(0, 255, 0);
      noStroke();
      circle(keypoint.x, keypoint.y, 10);
    }

    let sumX = 0;
    let sumY = 0;
    for (let k = 0; k < hand.keypoints.length; k++) {
      sumX += hand.keypoints[k].x;
      sumY += hand.keypoints[k].y;
    }
    let handX = sumX / hand.keypoints.length;
    let handY = sumY / hand.keypoints.length;
    
    let fistDetected = isFist(hand);
    
 
    if (fistDetected && !fistWasClosed) {
      fistWasClosed = true;
 
      for (let idx = 0; idx < balls.length; idx++) {
        if (isHandTouchingBall(hand, balls[idx])) {
          dragging = true;
          draggedBallIndex = idx;
          dragSetX = balls[idx].x - handX;
          dragSetY = balls[idx].y - handY + 30; 
          break;
        }
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
  }
  

  for (let i = balls.length - 1; i >= 0; i--) {
    let ball = balls[i];
    
    if (ball.x < 100) {
      balls.splice(i, 1);
      
      // Poule capturée !
      captureChicken();
  
      if (draggedBallIndex === i) {
        dragging = false;
        draggedBallIndex = -1;
      } else if (draggedBallIndex > i) {
        draggedBallIndex--;
      }
    } else {
      fill(255, 255, 0);
      circle(ball.x, ball.y, ball.r);
    }
  }
  
  pop();

  // Afficher le score et les vies
  fill(255);
  textSize(20);
  textAlign(LEFT);
  text('Score: ' + score, 20, 30);
  text('Vies: ' + life, 20, 60);
  text('Manches: ' + roundsPlayed, 20, 90);
  text('Ultime: ' + ultimateCharge + '/5', 20, 120);
  
  // Game over si plus de vies
  if (boolGameOver) {
    textAlign(CENTER);
    textSize(40);
    fill(255, 0, 0);
    text('GAME OVER', width/2, height/2);
    textSize(20);
    text('Appuyez sur ESPACE pour recommencer', width/2, height/2 + 40);
  }
}


// Callback function for when handPose outputs data
function gotHands(results) {
  // save the output to the hands variable
  hands = results;
}

function isFist(hand) {
  const wrist = hand.keypoints[0];

  const tips = [
    hand.keypoints[8], 
    hand.keypoints[12],
    hand.keypoints[16],
    hand.keypoints[20]
  ];

  let sum = 0;

  for (let tip of tips) {
    sum += dist(wrist.x, wrist.y, tip.x, tip.y);
  }

  let avgDistance = sum / tips.length;

  return avgDistance < 120; 
}

function isHandTouchingBall(hand, ball) {

  for (let i = 3; i < hand.keypoints.length; i++) {
    let keypoint = hand.keypoints[i];
    if (dist(keypoint.x, keypoint.y, ball.x, ball.y) < ball.r) {
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
  
  // Nombre de poules augmente avec les manches (3 de base + manche/2 + aléatoire)
  let baseChickens = 3 + floor(roundsPlayed / 2);
  currentWaveChickens = baseChickens + floor(random(0, 3));
  
  // Vitesse augmente avec les manches (1 à 5+)
  chickenSpeed = 1 + (roundsPlayed * 0.3);
  
  // Créer les balls/poules pour cette vague
  for(let i = 0; i < currentWaveChickens; i++) {
    let x = random(400, 700);
    let y = random(100, 700);
    let r = random(100, 125);
    balls.push({x: x, y: y, r: r});
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
function captureChicken() {
  chickensCaptured++;
  score++; // +1 au score pour chaque poule capturée
  
  // Charger l'ultime (max 5)
  if (ultimateCharge < 5) {
    ultimateCharge++;
  }
  
  // Si toutes les poules sont capturées = victoire
  if (chickensCaptured >= currentWaveChickens) {
    endRound(true);
    startNewRound();
  }
}

// Fonction pour tirer sur une poule casquée ciblée
function shootTargetedChicken() {
  // TODO: Vérifier si une poule casquée est ciblée via détection main
  // Si targetedChicken existe et est casquée:
  //   - Retirer le casque ou détruire la poule
  //   - captureChicken();
  //   - targetedChicken = null;
  
  console.log('Tir sur poule casquée ciblée');
}

// Fonction pour activer l'ultime (onde de choc)
function activateUltimate() {
  if (ultimateCharge >= 5) {
    // TODO: Étourdir toutes les poules en mouvement
    // Pour chaque poule:
    //   - Arrêter son mouvement temporairement (stunned = true)
    //   - Ajouter animation d'étourdissement
    //   - Après quelques secondes, reprendre le mouvement
    
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
  }
  
  // Récupérer toutes les vies toutes les 5 manches
  if (roundsPlayed % 5 === 0) {
    life = 5;
  }
}

function keyPressed() {
	// Ultime: flèche droite + flèche gauche simultanément
	if (kb.pressing('ArrowLeft') && kb.pressing('ArrowRight')) {
		activateUltimate();
		return;
	}
	
	if (kb.presses('space')) {
		// Si game over, recommencer
		if (boolGameOver) {
			startNewGame();
			return;
		}
		
		// Tirer sur une poule casquée si elle est ciblée
		if (targetedChicken) {
			shootTargetedChicken();
		} else {
			// Toggle between ellipse 1 and 2 (pour les tests)
			currentEllipse = currentEllipse === 1 ? 2 : 1;
		}
	}
}