let handPose;
let video;
let hands = [];
let fistWasClosed = false;
let balls = [];
let dragging = false;
let dragSetX = 0;
let dragSetY = 0;
let draggedBallIndex = -1;
let score = 0;
let life = 5;
let roundsPlayed = 0;
let boolGameOver = false;
let currentWaveChickens = 0;
let chickensCaptured = 0;
let chickenSpeed = 1;
let ultimateCharge = 0; // 5 poules capturées = 1 ultime 
let targetedChicken = null; // Poule actuellement visée
let smoothHandX = 0;
let smoothHandY = 0;
let showRoundComplete = false;
let roundCompleteTimer = 0;
let closestBallIndex = -1;
let ultimateActive = false; // L'ultime est activé
let ultimateFreezeTimer = 0; // Timer pour le freeze de 5 secondes
let chickenSprite; // Sprite de la poule basique
let chickenGoldSprite; // Sprite de la poule dorée
let chickenSoldierSprite; // Sprite de la poule avec casque
let chickenTransitionSprite; // Sprite de transition casque -> normal
let foxSprite; // Sprite du renard
let foxJumpSprite; // Sprite du renard qui saute pour manger
let heartSprite; // Sprite sheet des cœurs pour les vies
let handSprite; // Sprite de la main (frame 0 = ouverte, frame 1 = fermée)
let backgroundDay; // Background pour les manches
let backgroundNight; // Background pour la fin de manche
let foxFrame = 0; // Frame actuelle du renard
let foxFrameTimer = 0; // Timer pour l'animation du renard
let foxJumping = false; // Le renard est en train de sauter
let foxJumpFrame = 0; // Frame du saut
let foxJumpTimer = 0; // Timer pour le saut
let pendingChickenToEat = null; // Poule en attente d'être mangée

function preload() {
  // Load the handPose model 
  handPose = ml5.handPose();
  // Charger les sprites
  chickenSprite = loadImage('assets/Chicken1-Sheet.png');
  chickenGoldSprite = loadImage('assets/Gold_chicken.png');
  chickenSoldierSprite = loadImage('assets/chicken_soldier-Sheet.png');
  chickenTransitionSprite = loadImage('assets/anim_helmet-Sheet.png');
  foxSprite = loadImage('assets/Fox-Normal-Sheet.png');
  foxJumpSprite = loadImage('assets/Fox-Jump-Sheet.png');
  heartSprite = loadImage('assets/coeur-export.png');
  handSprite = loadImage('assets/Hand-Sheet.png');
  // Charger les backgrounds
  backgroundDay = loadImage('assets/background_day.png');
  backgroundNight = loadImage('assets/background_night.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight); // Create the webcam video and hide it 
  video = createCapture(VIDEO);
  video.size(windowWidth, windowHeight)
  video.hide(); // start detecting hands from the webcam video 
  handPose.detectStart(video, gotHands);
  smoothHandX = width / 2;
  smoothHandY = height / 2;
  life = 5; // Initialiser les vies
  // Démarrer la première vague 
  startNewRound();
}

function draw() {
  // Afficher le background
  if (backgroundDay && backgroundDay.width > 0) {
    image(backgroundDay, 0, 0, width, height);
  } else {
    background(30, 30, 50);
  }
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
    smoothHandX = lerp(smoothHandX, handX, 0.7);
    smoothHandY = lerp(smoothHandY, handY, 0.7); 
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
      ball.x = lerp(ball.x, targetX, 0.98);
      ball.y = lerp(ball.y, targetY, 0.98);
    }
    if (!fistDetected) {
      fistWasClosed = false;
      // Remettre la poule sur la ligne la plus proche avant de la lâcher
      if (dragging && draggedBallIndex >= 0) {
        let ball = balls[draggedBallIndex];
        ball.y = getClosestLine(ball.y);
      }
      dragging = false;
      draggedBallIndex = -1;
    }
    // Détecter quelle poule de type 2 est visée par la main
    targetedChicken = null;
    let closestArmoredDist = Infinity;
    for (let ball of balls) {
      if (ball.type === 2) {
        let d = dist(handX, handY, ball.x, ball.y);
        if (d < 150 && d < closestArmoredDist) { // Rayon de visée de 150px
          closestArmoredDist = d;
          targetedChicken = ball;
        }
      }
    }
  } else {
    targetedChicken = null;
  }

  for (let i = balls.length - 1; i >= 0; i--) {
    let ball = balls[i];
        // Ignorer les poules qui sont en train d'être mangées
    if (ball.beingEaten) {
      continue;
    }
        // Ne bouger que les poules qui ne sont pas traînées
    if (!dragging || draggedBallIndex !== i) {
      // Ne pas bouger si l'ultime est actif
      if (!ultimateActive) {
        ball.x += ball.speed * ball.direction;
      }
      
      // Si la poule atteint le bord droit (et allait vers la droite)
      if (ball.x > width + 50 && ball.direction === 1) {
        ball.direction = -1; // Inverser la direction
        ball.loops++;
        let allerRetours = Math.floor(ball.loops / 2);
        console.log('Poule rebondit à droite - Rebonds: ' + ball.loops + ' - Allers-retours: ' + allerRetours + '/5');
      }
      // Si la poule atteint le bord gauche (et allait vers la gauche)
      else if (ball.x < 200 && ball.direction === -1) {
        ball.direction = 1; // Inverser la direction
        ball.loops++;
        let allerRetours = Math.floor(ball.loops / 2);
        console.log('Poule rebondit à gauche - Rebonds: ' + ball.loops + ' - Allers-retours: ' + allerRetours + '/5');
        
        // Après 5 allers-retours complets (10 rebonds), la poule disparait
        if (ball.loops >= 10) {
          console.log('POULE ÉCHAPPE ! Total: ' + allerRetours + ' allers-retours - Vies restantes: ' + (life - 1));
          life--;
          balls.splice(i, 1);
          if (draggedBallIndex === i) {
            dragging = false;
            draggedBallIndex = -1;
          } else if (draggedBallIndex > i) {
            draggedBallIndex--;
          }
          
          if (life <= 0) {
            boolGameOver = true;
          }
          continue;
        }
      }
    }
    
    // Gérer l'animation de transition
    if (ball.transitioning) {
      ball.transitionTimer++;
      if (ball.transitionTimer > 5) { // Changer de frame toutes les 5 frames
        ball.transitionFrame++;
        ball.transitionTimer = 0;
        
        if (ball.transitionFrame >= 8) { // 8 frames de transition
          // Fin de la transition, transformer en poule normale
          ball.transitioning = false;
          ball.type = 0;
          ball.color = [255, 0, 0];
          ball.points = 1;
          ball.r = 64;
          ball.frame = 0;
          ball.frameTimer = 0;
          delete ball.armor;
        }
      }
    }
  }
  for (let i = balls.length - 1; i >= 0; i--) {
    let ball = balls[i];

    // Si la balle est traînée vers le renard (zone de capture)
    if (ball.x < 140 && dragging && draggedBallIndex === i && !foxJumping) {
      // Déclencher l'animation du renard
      foxJumping = true;
      foxJumpFrame = 0;
      foxJumpTimer = 0;
      pendingChickenToEat = ball;
      ball.beingEaten = true; // Marquer la poule comme en train d'être mangée
      
      // La poule sera supprimée à la frame 8 de l'animation
      captureChicken(ball); // Compter les points immédiatement
      
      if (draggedBallIndex === i) {
        dragging = false;
        draggedBallIndex = -1;
      } else if (draggedBallIndex > i) {
        draggedBallIndex--;
      }
      continue;
    }
    
    // Afficher l'animation de transition
    if (ball.transitioning) {
      push();
      imageMode(CENTER);
      // Miroir si la poule va vers la gauche
      if (ball.direction === -1) {
        translate(ball.x, 0);
        scale(-1, 1);
        translate(-ball.x, 0);
      }
      if (chickenTransitionSprite && chickenTransitionSprite.width > 0) {
        let sx = ball.transitionFrame * 64;
        let sy = 0;
        image(chickenTransitionSprite, ball.x, ball.y, 64, 96, sx, sy, 64, 96);
      }
      pop();
    }
    // Afficher le sprite pour les poules basiques
    else if (ball.type === 0) {
      // Animer le sprite (3 frames)
      ball.frameTimer++;
      if (ball.frameTimer > 10) { // Changer de frame toutes les 10 frames
        ball.frame = (ball.frame + 1) % 3; // 3 frames dans le sprite
        ball.frameTimer = 0;
      }
      
      push();
      imageMode(CENTER);
      // Miroir si la poule va vers la gauche
      if (ball.direction === -1) {
        translate(ball.x, 0);
        scale(-1, 1);
        translate(-ball.x, 0);
      }
      // Vérifier que le sprite est bien chargé
      if (chickenSprite && chickenSprite.width > 0) {
        // Extraire la frame du sprite sheet
        let sx = ball.frame * 64; // Position X dans le sprite sheet
        let sy = 0; // Position Y dans le sprite sheet
        image(chickenSprite, ball.x, ball.y, 64, 64, sx, sy, 64, 64);
      } else {
        // Afficher un cercle en attendant le chargement
        fill(ball.color[0], ball.color[1], ball.color[2]);
        circle(ball.x, ball.y, ball.r);
      }
      pop();
    } else if (ball.type === 1) {
      // Poule dorée - sprite animé
      ball.frameTimer++;
      if (ball.frameTimer > 10) {
        ball.frame = (ball.frame + 1) % 5; // 5 frames dans le sprite
        ball.frameTimer = 0;
      }
      
      push();
      imageMode(CENTER);
      // Miroir si la poule va vers la gauche
      if (ball.direction === -1) {
        translate(ball.x, 0);
        scale(-1, 1);
        translate(-ball.x, 0);
      }
      if (chickenGoldSprite && chickenGoldSprite.width > 0) {
        let sx = ball.frame * 64; // Position X dans le sprite sheet
        let sy = 0; // Position Y dans le sprite sheet
        image(chickenGoldSprite, ball.x, ball.y, 64, 64, sx, sy, 64, 64);
      } else {
        // Afficher un cercle en attendant le chargement
        fill(ball.color[0], ball.color[1], ball.color[2]);
        circle(ball.x, ball.y, ball.r);
      }
      pop();
    } else if (ball.type === 2) {
      // Poule avec casque - sprite animé
      ball.frameTimer++;
      if (ball.frameTimer > 10) {
        ball.frame = (ball.frame + 1) % 3;
        ball.frameTimer = 0;
      }
      
      push();
      imageMode(CENTER);
      // Miroir si la poule va vers la gauche
      if (ball.direction === -1) {
        translate(ball.x, 0);
        scale(-1, 1);
        translate(-ball.x, 0);
      }
      if (chickenSoldierSprite && chickenSoldierSprite.width > 0) {
        let sx = ball.frame * 64;
        let sy = 0;
        image(chickenSoldierSprite, ball.x, ball.y, 64, 90, sx, sy, 64, 90);
      } else {
        fill(ball.color[0], ball.color[1], ball.color[2]);
        circle(ball.x, ball.y, ball.r);
      }
      pop();
    } else {
      // Cercles pour les autres types de poules
      fill(ball.color[0], ball.color[1], ball.color[2]);
      circle(ball.x, ball.y, ball.r);
    }
  }
  
  // Afficher la main au-dessus de tout (après les poules)
  if (hands.length > 0) {
    push();
    translate(width, 0);
    scale(-1, 1);
    
    let hand = hands[0];
    let fistDetected = isFist(hand);
    
    // Afficher le sprite de la main au lieu du cercle
    if (handSprite && handSprite.width > 0) {
      // Frame 0 = main ouverte, Frame 1 = main fermée (poing)
      let handFrame = (fistDetected && dragging) ? 1 : 0;
      let frameWidth = handSprite.width / 2; // 2 frames dans le sprite
      let sx = handFrame * frameWidth;
      
      imageMode(CENTER);
      // Agrandir la main pour meilleure visibilité
      image(handSprite, width - smoothHandX, smoothHandY, frameWidth * 1.5, handSprite.height * 1.5, sx, 0, frameWidth, handSprite.height);
    } else {
      // Fallback : afficher le cercle si le sprite n'est pas chargé
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
    }
    pop();
  }
  
  // Afficher le score et les vies 
  fill(255);
  textSize(20);
  textAlign(LEFT);
  text('Score: ' + score, 20, 30);
  
  // Afficher les vies avec le sprite sheet des cœurs (en haut à droite)
  if (heartSprite && heartSprite.width > 0) {
    // Calculer quelle frame afficher (inversé : 5 vies = frame 0, 0 vie = frame 5)
    let heartFrame = 5 - life;
    let frameWidth = heartSprite.width / 6; // 6 frames dans le sprite sheet
    let sx = heartFrame * frameWidth;
    push();
    imageMode(CORNER);
    // Agrandir la barre de vie pour meilleure visibilité et la monter vraiment en haut
    image(heartSprite, width - frameWidth * 3, -35, frameWidth * 3, heartSprite.height * 3, sx, 0, frameWidth, heartSprite.height);
    pop();
  } else {
    text('Vies: ' + life, 20, 60);
  }
  
  text('Manches: ' + roundsPlayed, 20, 60);
  text('Ultime: ' + ultimateCharge + '/5', 20, 120);
  
  // Afficher le renard animé en bas à gauche
  if (foxJumping) {
    // Animation de saut
    if (foxJumpSprite && foxJumpSprite.width > 0) {
      foxJumpTimer++;
      if (foxJumpTimer > 3) { // Animation plus rapide pour le saut
        foxJumpFrame++;
        foxJumpTimer = 0;
        
        // Frame 8 = moment où la poule disparait
        if (foxJumpFrame === 8 && pendingChickenToEat) {
          // Supprimer la poule de la liste
          let index = balls.indexOf(pendingChickenToEat);
          if (index >= 0) {
            balls.splice(index, 1);
            if (draggedBallIndex === index) {
              dragging = false;
              draggedBallIndex = -1;
            } else if (draggedBallIndex > index) {
              draggedBallIndex--;
            }
          }
          pendingChickenToEat = null;
        }
        
        // Fin de l'animation de saut (environ 12-15 frames)
        if (foxJumpFrame >= 12) {
          foxJumping = false;
          foxJumpFrame = 0;
          foxFrame = 0;
        }
      }
      
      push();
      imageMode(CORNER);
      let sx = foxJumpFrame * 64;
      let sy = 0;
      image(foxJumpSprite, 10, height - 286, 128, 256, sx, sy, 64, 128);
      pop();
    }
  } else {
    // Animation normale
    if (foxSprite && foxSprite.width > 0) {
      foxFrameTimer++;
      if (foxFrameTimer > 10) {
        foxFrame = (foxFrame + 1) % 6; // 6 frames d'animation
        foxFrameTimer = 0;
      }
      
      push();
      imageMode(CORNER);
      let sx = foxFrame * 64;
      let sy = 0;
      image(foxSprite, 10, height - 158, 128, 128, sx, sy, 64, 64);
      pop();
    }
  }
  
  // Minimap avec vidéo et squelette de la main superposés
  push();
  translate(150, 140);
  scale(-1, 1);
  
  // Afficher la vidéo en arrière-plan
  image(video, 0, 0, 150, 120);

  if (hands.length > 0) {
    let hand = hands[0];
    let scaleX = 150 / width;
    let scaleY = 120 / height;
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
    // Afficher le background de nuit pour la fin de manche
    if (backgroundNight && backgroundNight.width > 0) {
      image(backgroundNight, 0, 0, width, height);
    } else {
      fill(0, 0, 0, 200);
    }
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
}
// Callback function for when handPose outputs data 
function gotHands(results) { // save the output to the hands variable 
  hands = results;
}

function getClosestLine(y) {
  // Les 3 lignes de poules
  let lignes = [height / 4 + 10, height / 2 + 90, (height * 3) / 4 + 55];
  let closestLine = lignes[0];
  let minDist = abs(y - lignes[0]);
  
  for (let ligne of lignes) {
    let d = abs(y - ligne);
    if (d < minDist) {
      minDist = d;
      closestLine = ligne;
    }
  }
  
  return closestLine;
}

function isFist(hand) {
  const wrist = hand.keypoints[0];
  const tips = [hand.keypoints[8], hand.keypoints[12], hand.keypoints[16], hand.keypoints[20]];
  let sum = 0;
  for (let tip of tips) {
    sum += dist(wrist.x, wrist.y, tip.x, tip.y);
  }
  let avgDistance = sum / tips.length;
  return avgDistance < 155; // Augmenté pour grip encore plus stable
}

function isHandTouchingBall(hand, ball) {
  let detectionRadius = ball.r * 1.2; // Réduit pour plus de difficulté

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
  
  // Augmenter la difficulté à chaque manche
  let poulesParLigne = 3 + roundsPlayed; // Commence à 3, augmente de 1 par manche
  chickenSpeed = 0.5 + (roundsPlayed * 0.1); // Vitesse augmente progressivement
  
  // 3 lignes de poules avec décalages
  let lignes = [height / 4 + 10, height / 2 + 90, (height * 3) / 4 + 55];
  
  currentWaveChickens = 0;
  
  for (let ligne of lignes) {
    // Nombre aléatoire de poules par ligne
    let nombrePoulesCetteLigne = floor(random(poulesParLigne - 1, poulesParLigne + 2));
    currentWaveChickens += nombrePoulesCetteLigne;
    
    for (let i = 0; i < nombrePoulesCetteLigne; i++) {
      let x = 300 + (i * 250) + random(-30, 30); // Espacement avec variation, démarrage plus loin du renard
      let y = ligne; // Ligne fixe, pas de variation verticale
      
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
        speed: chickenSpeed + random(-0.1, 0.1), // Petite variation de vitesse
        loops: 0, // Compteur d'allers-retours
        direction: 1 // 1 = droite, -1 = gauche
      };
      
      if (ballType === 0) {
        ball.r = 64;
        ball.color = [255, 0, 0];
        ball.points = 1;
        ball.frame = 0;
        ball.frameTimer = 0;
      } else if (ballType === 1) {
        ball.r = 64;
        ball.color = [255, 255, 0];
        ball.points = 2;
        ball.frame = 0;
        ball.frameTimer = 0;
      } else {
        ball.r = 90;
        ball.color = [100, 150, 255];
        ball.points = 3;
        ball.armor = 2;
        ball.frame = 0;
        ball.frameTimer = 0;
      }
      
      balls.push(ball);
    }
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
  score += points;
  
  // Charger l'ultime (max 5) - UNIQUEMENT avec les golden chickens
  if (ultimateCharge < 5 && ball && ball.type === 1) {
    ultimateCharge++; // Golden chicken charge l'ultime
    // Plafonner à 5
    if (ultimateCharge > 5) {
      ultimateCharge = 5;
    }
  }
  
  // Si toutes les poules sont capturées = victoire 
  if (chickensCaptured >= currentWaveChickens) {
    endRound(true);
    showRoundComplete = true;
  }
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
  // Les vies baissent UNIQUEMENT quand les poules s'échappent après leurs allers-retours
  // Donc on ne touche PAS aux vies ici
  
  // Récupérer toutes les vies toutes les 5 manches 
  if (roundsPlayed % 5 === 0) {
    life = 5;
  }
  
  // Gérer le timer de l'ultime
  if (ultimateActive) {
    ultimateFreezeTimer++;
    if (ultimateFreezeTimer >= 300) { // 300 frames = 5 secondes à 60 FPS
      ultimateActive = false;
      ultimateFreezeTimer = 0;
    }
  }
}

function activateUltimate() {
  ultimateActive = true;
  ultimateFreezeTimer = 0;
  ultimateCharge = 0; // Réinitialiser la jauge
  console.log('ULTIME ACTIVÉ ! Les poules sont gelées pendant 5 secondes');
}

function keyPressed() {
  // Ultime: flèche droite + flèche gauche simultanément
  if ((keyIsDown(LEFT_ARROW) && keyCode === RIGHT_ARROW) || (keyIsDown(RIGHT_ARROW) && keyCode === LEFT_ARROW)) {
    if (ultimateCharge >= 5 && !ultimateActive) {
      activateUltimate();
      return;
    }
  }
  
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
    
    // Tirer sur la poule avec casque visée
    if (targetedChicken && targetedChicken.type === 2) {
      targetedChicken.armor--;
      if (targetedChicken.armor <= 0) {
        // Démarrer l'animation de transition
        targetedChicken.transitioning = true;
        targetedChicken.transitionFrame = 0;
        targetedChicken.transitionTimer = 0;
      }
      targetedChicken = null;
    }
  }
}