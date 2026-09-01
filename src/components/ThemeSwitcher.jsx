import React, { useState } from 'react';
import { IconSun, IconMoon, IconSunset } from '@tabler/icons-react';

export default function ThemeSwitcher() {
  const [activeOption, setActiveOption] = useState('1');
  const [previousOption, setPreviousOption] = useState('1');

  const handleChange = (e) => {
    setPreviousOption(activeOption);
    setActiveOption(e.target.dataset.option);
  };

  return (
    <div className="switcher" c-previous={previousOption} style={{ transform: 'scale(0.6)', transformOrigin: 'right center' }}>
      <span className="switcher__legend">Theme Switcher</span>

      <label className="switcher__option">
        <input 
          className="switcher__input" 
          type="radio" 
          name="theme" 
          value="light" 
          c-option="1" 
          checked={activeOption === '1'} 
          onChange={handleChange}
          data-option="1"
        />
        <IconSun className="switcher__icon" stroke={1.5} />
      </label>

      <label className="switcher__option">
        <input 
          className="switcher__input" 
          type="radio" 
          name="theme" 
          value="dark" 
          c-option="2" 
          checked={activeOption === '2'} 
          onChange={handleChange}
          data-option="2"
        />
        <IconMoon className="switcher__icon" stroke={1.5} />
      </label>

      <label className="switcher__option">
        <input 
          className="switcher__input" 
          type="radio" 
          name="theme" 
          value="dim" 
          c-option="3" 
          checked={activeOption === '3'} 
          onChange={handleChange}
          data-option="3"
        />
        <IconSunset className="switcher__icon" stroke={1.5} />
      </label>
    </div>
  );
}
