# Specific Games

Missing features
- Add ability to save / load multiple, along with savegame game ID checking
- Add mouse support for movement interaction
    - Add inventory screen that is clickable
- Add UI for options (TTS, volume, input style, controls)

## Space Quest 2

Issues:

- Root monster in room 21 cannot actually finish this maze without diagonal movement!
  
- Aliens don't bounce in room 23

- Restoring game at room 5 always puts ego near the airlock chamber (instead of where ego should be)
  - This is due to script.save and loading script not being implemented yet

References:

- https://youtu.be/eVsF_FZ54O0?t=1828
- http://sarien.net/spacequest2#outsidexos4
- http://www.sierrahelp.com/Misc/PointLists/SQ2Points.html

Progress:

- Now in Room 10!
  
- print.at and text.screen not really working properly

- Need an inventory screen / parse inventory item names correctly
  - Just a text list of items
- Need to filter buttons by keywords
- Mouse control? Or virtual joystick control?

## Space Quest 1

Issues:

- Sarien sprite is not facing the correct direction!
- Beam fired by Sarien does not travel correctly!
  - It's supposed to hit ego and kill him but gets stuck often

## Sierra Demo Pack 5

Issues:

- SQ1 demo loops indefinitely even when running normally

References:

- https://archive.org/details/SierraAgiDemoPack5
- http://localhost:3000/#/game/agi/demo/archive1.zip
