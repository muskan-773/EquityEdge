import React from 'react';
import Hero from './Hero';
import Stats from './Stats';
import Pricing from './Pricing';
import Eduacation from './Education';
import OpenAccount from '../../OpenAccount';
import Navbar from '../../Navbar';
import Footer from '../../Footer';

function HomePage() {
  return ( 
    <>
       <Hero />
       <Stats />
       <Pricing />
       <Eduacation />
       <OpenAccount />
    </>
   );
}

export default HomePage;