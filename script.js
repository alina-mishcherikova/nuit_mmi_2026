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
  for(let i=0;i<ballNumber;i++){
    let x=random(100, 700);
    let y=random(100,700);
    let r=random(100,125);
    balls.push({x: x, y: y, r: r});
  }
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
