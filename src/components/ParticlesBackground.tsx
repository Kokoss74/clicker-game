import React, { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import {
  type ISourceOptions,
} from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

interface ParticlesBackgroundProps {
  effectiveTheme: 'light' | 'dark';
}

const ParticlesBackground: React.FC<ParticlesBackgroundProps> = ({ effectiveTheme }) => {
  const [init, setInit] = useState(false);

  // Initialize particles engine once on mount
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      console.log("Particles engine initialized"); 
      setInit(true);
    });
  }, []);

  // Calculate options based on the passed effectiveTheme prop
  const options: ISourceOptions = useMemo(
    () => {
      const bgColor = effectiveTheme === 'dark' ? "#1a202c" : "#f0f0f0";
      const particleColor = effectiveTheme === 'dark' ? "#ffffff" : "#333333";
      const linkColor = effectiveTheme === 'dark' ? "#ffffff" : "#555555";

      return {
        "autoPlay": true,
        "background": {
          "color": {
            "value": bgColor
          },
          "image": "",
          "position": "",
          "repeat": "",
          "size": "",
          "opacity": 1
        },
        "backgroundMask": {
          "composite": "destination-out",
          "cover": {
            "opacity": 1,
            "color": {
              "value": ""
            }
          },
          "enable": false
        },
        "clear": true,
        "defaultThemes": {},
        "delay": 0,
        "fullScreen": {
          "enable": true,
          "zIndex": 1 // Ensure particles are behind other content
        },
        "detectRetina": true,
        "duration": 0,
        "fpsLimit": 120,
        "interactivity": {
          "detectsOn": "window",
          "events": {
            "onClick": {
              "enable": true,
              "mode": "push"
            },
            "onDiv": {
              "enable": false,
              "type": "circle"
            },
            "onHover": {
              "enable": true,
              "mode": "grab",
              "parallax": {
                "enable": true,
                "force": 60,
                "smooth": 10
              }
            },
            "resize": {
              "delay": 0.5,
              "enable": true
            }
          },
          "modes": {
            "trail": {
              "delay": 1,
              "pauseOnStop": false,
              "quantity": 1
            },
            "attract": {
              "distance": 200,
              "duration": 0.4,
              "easing": "ease-out-quad",
              "factor": 1,
              "maxSpeed": 50,
              "speed": 1
            },
            "bounce": {
              "distance": 200
            },
            "bubble": {
              "distance": 400,
              "duration": 2,
              "mix": false,
              "opacity": 0.8,
              "size": 40,
              "divs": {
                "distance": 200,
                "duration": 0.4,
                "mix": false,
                "selectors": {}
              }
            },
            "connect": {
              "distance": 80,
              "links": {
                "opacity": 0.5
              },
              "radius": 60
            },
            "grab": {
              "distance": 400,
              "links": {
                "blink": false,
                "consent": false,
                "opacity": 1
              }
            },
            "push": {
              "default": true,
              "groups": [],
              "quantity": 4
            },
            "remove": {
              "quantity": 2
            },
            "repulse": {
              "distance": 200,
              "duration": 0.4,
              "factor": 100,
              "speed": 1,
              "maxSpeed": 50,
              "easing": "ease-out-quad",
              "divs": {
                "distance": 200,
                "duration": 0.4,
                "factor": 100,
                "speed": 1,
                "maxSpeed": 50,
                "easing": "ease-out-quad",
                "selectors": {}
              }
            },
            "slow": {
              "factor": 3,
              "radius": 200
            },
            "particle": {
              "replaceCursor": false,
              "pauseOnStop": false,
              "stopDelay": 0
            },
            "light": {
              "area": {
                "gradient": {
                  "start": {
                    "value": "#ffffff"
                  },
                  "stop": {
                    "value": "#000000"
                  }
                },
                "radius": 1000
              },
              "shadow": {
                "color": {
                  "value": "#000000"
                },
                "length": 2000
              }
            }
          }
        },
        "manualParticles": [],
        "particles": {
          "bounce": {
            "horizontal": {
              "value": 1
            },
            "vertical": {
              "value": 1
            }
          },
          "collisions": {
            "absorb": {
              "speed": 2
            },
            "bounce": {
              "horizontal": {
                "value": 1
              },
              "vertical": {
                "value": 1
              }
            },
            "enable": false,
            "maxSpeed": 50,
            "mode": "bounce",
            "overlap": {
              "enable": true,
              "retries": 0
            }
          },
          "color": {
            "value": particleColor, // Dynamic color based on prop
            "animation": {
              "h": { "enable": false },
              "s": { "enable": false },
              "l": { "enable": false }
            }
          },
          "effect": {
            "close": true,
            "fill": true,
            "options": {},
            "type": undefined
          },
          "move": {
            "angle": { "offset": 0, "value": 90 },
            "attract": { "enable": false },
            "center": { "x": 50, "y": 50, "mode": "percent", "radius": 0 },
            "decay": 0,
            "distance": {},
            "direction": "none",
            "drift": 0,
            "enable": true,
            "gravity": { "enable": false },
            "path": { "enable": false },
            "outModes": { "default": "out" },
            "random": false,
            "size": false,
            "speed": 2,
            "spin": { "enable": false },
            "straight": false,
            "trail": { "enable": false },
            "vibrate": false,
            "warp": false
          },
          "number": {
            "density": { "enable": true, "width": 1920, "height": 1080 },
            "limit": { "mode": "delete", "value": 0 },
            "value": 100
          },
          "opacity": {
            "value": { "min": 0.1, "max": 0.5 },
            "animation": { "enable": true, "speed": 3, "sync": false, "mode": "auto", "startValue": "random" }
          },
          "reduceDuplicates": false,
          "shadow": { "enable": false },
          "shape": { "type": "circle" },
          "size": {
            "value": { "min": 1, "max": 10 },
            "animation": { "enable": true, "speed": 20, "sync": false, "mode": "auto", "startValue": "random" }
          },
          "stroke": { "width": 0 },
          "zIndex": { "value": 0, "opacityRate": 1, "sizeRate": 1, "velocityRate": 1 },
          "destroy": { "mode": "none" },
          "roll": { "enable": false },
          "tilt": { "enable": false },
          "twinkle": { "lines": { "enable": false }, "particles": { "enable": false } },
          "wobble": { "enable": false },
          "life": { "count": 0, "delay": { "value": 0 }, "duration": { "value": 0 } },
          "rotate": { "animation": { "enable": false } },
          "orbit": { "enable": false },
          "links": {
            "blink": false,
            "color": { "value": linkColor }, // Dynamic color based on prop
            "consent": false,
            "distance": 150,
            "enable": true,
            "frequency": 1,
            "opacity": 0.4,
            "shadow": { "enable": false },
            "triangles": { "enable": false },
            "width": 1,
            "warp": false
          },
          "repulse": { "enabled": false }
        },
        "pauseOnBlur": true,
        "pauseOnOutsideViewport": true,
        "responsive": [],
        "smooth": false,
        "style": {},
        "themes": [],
        "zLayers": 100,
        "key": "parallax",
        "name": "Parallax",
        "motion": { "disable": false, "reduce": { "factor": 4, "value": true } }
      };
    },
    [effectiveTheme], // Recalculate options when the prop changes
  );

  if (init) {
    return (
      <Particles
        key={effectiveTheme} // Use the prop as key to force remount on theme change
        id="tsparticles"
        options={options}
      />
    );
  }

  return <></>; // Render nothing until initialized
};

export default ParticlesBackground;
