import React from 'react';
import Hero from './Hero';
import Stats from './Stats';
import Pricing from './Pricing';
import Education from './Education';
import OpenAccount from '../../OpenAccount';

// BUG FIXED: Removed dead imports of Navbar and Footer.
// They are already rendered in index.js — importing them here caused
// duplication and added unnecessary bundle weight.
// Also fixed: Eduacation → Education (typo in import alias)

function HomePage() {
  return ( 
    <>
       <Hero />
       <Stats />
       <Pricing />
       <Education />
       <OpenAccount />
    </>
   );
}

export default HomePage;