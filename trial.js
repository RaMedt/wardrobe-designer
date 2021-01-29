// Todos: 
// * Freiheitsgrade für Linien (z.B. nur hori./verti), mit Wirkung bei Move

const canvasSize = {
  x: 800,
  y: 600
}
const sensitivityRange = 20; // maximal distance to what an end point or line is found

let edges = [];
let menuBar = [];
let createMode = 1; // first mousePressed creates line
let moveMode = 0; // edit mode on/off
let currentEdgeIndex; // keeps the array-ID of the line in creation
let mode = 0; // working mode of the canvas (new = 0, move = 1, delete = 2)
let menu;

function setup() {
  createCanvas(canvasSize.x, canvasSize.y);

  // Loading menu icons and create instance
  for (i = 1; i < 4; i++) {
    img = loadImage("aed-" + i + ".png"); // Load the menu images
    menuBar.push(img);
  }
  menu = new Menu();
} // ########## END SETUP

function draw() {
  background(220);

  // menu at the top
  menu.show();

  // runs through all elements of the array
  // and displays all generated lines (aka Edges)
  for (let elmt of edges) {
    elmt.show();

    // Lets write the length of the line on to it
    let x1 = elmt.x1;
    let y1 = elmt.y1;
    let x2 = elmt.x2;
    let y2 = elmt.y2;

    // d is the length of the line
    let d = int(dist(x1, y1, x2, y2));

    // write d along the line
    push();
    textAlign(CENTER, CENTER);
    translate((x1 + x2) / 2, (y1 + y2) / 2);
    
    // to be allways on top ...
    let angle = atan2 (y2 - y1, x2 - x1);
    if (angle > PI/2){
      angle = angle - PI;
    } else if (angle < -PI/2){
      angle = angle + PI;
    } 
    
    rotate(angle);
    text(nfc(d, 1), 0, -5); // d, 1
    pop();

  }

  // FOR DEVELOPMENT PURPOSES
  // display of mouse coordinates at the icon
  displayMousePos();

  // Set the cursor icon according to the mode
  // Highlight End-Points (Node), or line (Edge) according to mode
  if (mode == 0) { // mode Add
    cursor(CROSS);
    closebyNode(sensitivityRange);
  } else if (mode == 1) { // Mode edit
    cursor('grab');
    closebyNode(sensitivityRange);
  } else if (mode == 2) { // Mode delete
    cursor(ARROW);
    closebyEdge(sensitivityRange)
  }
} // ########## END DRAW

// Definition of the object class for the menu

class Menu {
  constructor() {} // currently not required; all variables global

  // method show is called from "draw()" and displays the menu in current mode
  show() {
    let modeShow = mode;
    if (mouseX < 45 && mouseX > 10 && mouseY < 40 && mouseY > 10) {
      modeShow = 0;
    } else if (mouseX < 80 && mouseX > 45 && mouseY < 40 && mouseY > 10) {
      modeShow = 1;
    } else if (mouseX < 115 && mouseX > 80 && mouseY < 40 && mouseY > 10) {
      modeShow = 2;
    }

    image(menuBar[modeShow], 10, 10, menuBar[modeShow].width / 3, menuBar[modeShow].height / 3);

  }

}

// definition of object class for the lines (aka edges)
// x1/2 y1/2 are the start/endpoint coordinates 
// dragMode indicates if the line just has the start point and mouse "drags" it 
// dragMode = 1 means the 1st point is dragged, 2 means the 2nd point is dragged
// at "new" its allways the 2nd
// to the endpoint (startpoint fix, endpoint at the mous coordinates)
class Edge {
  constructor(x1, y1, x2, y2, dragMode) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.dragMode = dragMode; // 1 = 1st, 2 = 2nd, 0 = off
  }

  show() {
    if (this.dragMode == 1) {
      this.x1 = pick("x");
      this.y1 = pick("y");
    } else if (this.dragMode == 2) {
      this.x2 = pick("x");
      this.y2 = pick("y");
    }

    line(this.x1, this.y1, this.x2, this.y2);
  }
}

function mousePressed() {

  /*
  // First section: Keep menu out of range and switch mode
  //
  */

  // Check for menu click
  // this ends any line creation and switchs the mode
  // the mode can be 0 (add), 1 (edit), or 2 (delete)
  if (mouseX < 115 && mouseX > 10 && mouseY < 40 && mouseY > 10) {
    if (mouseX < 45 && mouseX > 10 && mouseY < 40 && mouseY > 10) {
      mode = 0;
    } else if (mouseX < 80 && mouseX > 45 && mouseY < 40 && mouseY > 10) {
      mode = 1;
    } else if (mouseX < 115 && mouseX > 80 && mouseY < 40 && mouseY > 10) {
      mode = 2;
    }

    if (createMode == 0) { // line in draw, waiting for end point
      edges.pop();
      createMode = 1;
      return;
    }
    return;
  }

  /*
  // Second section: Create line (aka Edge)
  //
  */

  if (mode == 0) {

    let neighbor = closestEndpoint(pick("x"), pick("y"), sensitivityRange);

    if (createMode == 1) { // create new line, endpoint still at mouspointer
      let e;
      if (neighbor[0] > 0) { // if there is a point in reach
        e = new Edge(neighbor[1], neighbor[2], pick("x"), pick("y"), 2);
      } else {
        e = new Edge(pick("x"), pick("y"), pick("x"), pick("y"), 2);
      }
      edges.push(e); // puts the interim element at the end of the array
      currentEdgeIndex = edges.length - 1;
      createMode = 0;

    } else { // finish line
      if (neighbor[0] > 0) { // if there is a point in reach
        edges[currentEdgeIndex].x2 = neighbor[1];
        edges[currentEdgeIndex].y2 = neighbor[2];

      } else { // stick the end point to the mouse pointer

        edges[currentEdgeIndex].x2 = pick("x");
        edges[currentEdgeIndex].y2 = pick("y");

      }
      edges[currentEdgeIndex].dragMode = 0;
      createMode = 1;
    }
  }

  /*
  // Third section: move line(s) (aka Edge(s))
  //
  */
  else if (mode == 1) {
    let match = [];

    if (moveMode == 0) { // no nodes identified yet; start it!

      // avoids failure if no line is drawn yet
      if (edges.length == 0) {
        return;
      }

      // lets watch if there is an lendpoint nearby
      // 0: Hit? 1: x, 2: y
      let neighbor = closestEndpoint(pick("x"), pick("y"), sensitivityRange);

      // find all adjacent endpoints (1 .. n)
      if (neighbor[0] > 0) { // if there is a point in reach

        let count = 0;
        moveMode = 1; // The node found will be moved

        // find all effected lines (aka Edges)
        for (i = 0; i < edges.length; i++) {

          if (edges[i].x1 == neighbor[1] && edges[i].y1 == neighbor[2]) {
            match[count] = {
              id: i,
              end: 1
            }
            count++;
          } else if (edges[i].x2 == neighbor[1] && edges[i].y2 == neighbor[2]) {
            match[count] = {
              id: i,
              end: 2
            }
            count++;
          }
        } // all lines checked

        // all line endings at this node in drag mode
        for (i = 0; i < match.length; i++) {
          edges[match[i].id].dragMode = match[i].end;
        }
      } else { // no point in reach
        return;
      }
    } else { // Node fount; drag mode is on

      // Set the new end-points at the mouse position and end the drag mode

      let neighbor = closestEndpoint(pick("x"), pick("y"), sensitivityRange);

      for (i = 0; i < edges.length; i++) {

        if (neighbor[0] > 0) { // if there is a point in reach
          if (edges[i].dragMode == 1) {
            edges[i].x1 = neighbor[1];
            edges[i].y1 = neighbor[2];
            edges[i].dragMode = 0;
          } else if (edges[i].dragMode == 2) {
            edges[i].x2 = neighbor[1];
            edges[i].y2 = neighbor[2];
            edges[i].dragMode = 0;
          }
        } else { // stick the end point to the mouse pointer
          if (edges[i].dragMode == 1) {
            edges[i].x1 = pick("x");
            edges[i].y1 = pick("y");
            edges[i].dragMode = 0;
          } else if (edges[i].dragMode == 2) {
            edges[i].x2 = pick("x");
            edges[i].y2 = pick("y");
            edges[i].dragMode = 0;
          }
        }
        moveMode = 0;
      }
    }
  }

  /*
  // Fourth section: remove line (aka Edge)
  //
  */
  else if (mode == 2) {

    // avoids failure if no line is drawn yet
    if (edges.length == 0) {
      return;
    }

    // lets watch if there is an line nearby and highlight it
    let neighbor = closestEdge(pick("x"), pick("y"), sensitivityRange);

    if (neighbor[0] > 0) { // if there is a line in reach
      // then delete line
      edges.splice(neighbor[1], 1);

    }

  }



}

// searching for close by line endpoints
// testX/Y defines the point to search the meighbor for
// minDist is the minimal distance to find a match; 0 means no limit (TO BE IMPLEMENTED)
function closestEndpoint(testX, testY, minDist) {
  let bestMatchX = mouseX;
  let bestMatchY = mouseY;
  let bestMatchDist = 999999;
  let bestMatchElmt;
  let match = 0;
  let x1, y1, x2, y2;

  for (let i = 0; i < edges.length; i++) {
    x1 = edges[i].x1;
    y1 = edges[i].y1;
    x2 = edges[i].x2;
    y2 = edges[i].y2;

    let d1 = dist(testX, testY, x1, y1);
    let d2 = dist(testX, testY, x2, y2);

    if (edges[i].dragMode == 0) {
      if (d1 <= minDist && d1 <= d2) {
        if (d1 < bestMatchDist) {
          bestMatchDist = d1;
          bestMatchElmt = i;
          bestMatchX = x1;
          bestMatchY = y1;
          match = 1;
        }

      } else if (d2 <= minDist && d2 <= d1) {
        if (d2 < bestMatchDist) {
          bestMatchDist = d2;
          bestMatchElmt = i;
          bestMatchX = x2;
          bestMatchY = y2;
          match = 1;
        }
      }
    }
  }

  return [match, bestMatchX, bestMatchY];
}

// Displays a line endpoint if cursor is close
// lets watch if there is an endpoint nearby and highlight it
function closebyNode(range) {

  let neighbor = closestEndpoint(pick("x"), pick("y"), range);

  if (neighbor[0] > 0) { // if there is a point in reach
    push(); // save current formatting
    fill('red');
    noStroke();
    ellipse(neighbor[1], neighbor[2], 10, 10);
    pop(); // restore previous formatting
  }
}

// searching for close by line 
// testX/Y defines the point to search the meighbor for
// minDist is the minimal distance to find a match; 0 means no limit (TO BE IMPLEMENTED)
function closestEdge(testX, testY, minDist) {
  let bestMatchX = mouseX;
  let bestMatchY = mouseY;
  let bestMatchDist = 999999;
  let bestMatchElmt;
  let match = 0;
  let x1, y1, x2, y2;

  for (let i = 0; i < edges.length; i++) {
    x1 = edges[i].x1;
    y1 = edges[i].y1;
    x2 = edges[i].x2;
    y2 = edges[i].y2;

    let d = pDistance(testX, testY, x1, y1, x2, y2);

    if (d <= minDist) {
      if (d < bestMatchDist) {
        bestMatchDist = d;
        bestMatchElmt = i;

        match = 1;
      }
    }
  }
  return [match, bestMatchElmt];
}

function closebyEdge(range) {

  // avoids failure if no line is drawn yet
  if (edges.length == 0) {
    return;
  }

  // lets watch if there is an line nearby and highlight it
  let neighbor = closestEdge(pick("x"), pick("y"), range);

  if (neighbor[0] > 0) { // if there is a line in reach
    push(); // save current formatting
    stroke('blue');
    strokeWeight(4);
    line(edges[neighbor[1]].x1, edges[neighbor[1]].y1, edges[neighbor[1]].x2, edges[neighbor[1]].y2);
    pop(); // restore
  }
}

function displayMousePos() {

  textSize(12);
  textAlign(CENTER, CENTER);
  text(mouseX + "/" + mouseY, mouseX, mouseY - 15);

}

/*
function keyPressed() {
  let keyIndex = key;
  print(kebyCode);
  print(mouseX);
}
*/

// lmits the pickable coordinates to the canvas
function pick(axis) {
  if (axis == "x") {
    if (mouseX > canvasSize.x) {
      return canvasSize.x;
    } else {
      return mouseX;
    }
  } else if (axis == "y") {
    if (mouseY > canvasSize.y) {
      return canvasSize.y;
    } else {
      return mouseY;
    }
  }
}


// Function to calculate distance point to line
function pDistance(x, y, x1, y1, x2, y2) {

  let A = x - x1;
  let B = y - y1;
  let C = x2 - x1;
  let D = y2 - y1;

  let dot = A * C + B * D;
  let len_sq = C * C + D * D;
  let param = -1;
  if (len_sq != 0) //in case of 0 length line
    param = dot / len_sq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  let dx = x - xx;
  let dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}