#sentient-logo-button {
  position: fixed;
  /* Calculation for bottom right corner (button 50px, margin 25px) */
  left: calc(100vw - 75px); /* Screen width - button width - right margin */
  top: calc(100vh - 75px);  /* Screen height - button height - bottom margin */
  width: 50px;   /* Logo width */
  height: 50px;  /* Logo height */
  background-image: url('chrome-extension://__MSG_@@extension_id__/images/sentient-logo.png'); /* Logo path */
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  z-index: 9999999; /* High z-index to appear on top */
  box-shadow: 0px 2px 10px rgba(0,0,0,0.2);
  transition: transform 0.2s ease-in-out;
  /* Ensure it's not hidden initially if styles conflict */
  display: block;
  opacity: 1;
}

#sentient-logo-button:hover {
  transform: scale(1.1); /* Slight zoom on hover */
}

/* Style for when dragging */
#sentient-logo-button:active {
  cursor: grabbing; /* Change cursor while dragging */
  box-shadow: 0px 4px 15px rgba(0,0,0,0.3); /* Enhance shadow while active */
}
