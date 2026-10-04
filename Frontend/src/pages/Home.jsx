import React from 'react'
import HeroSection from '../components/HeroSection'
import FeatueredSection from '../components/FeatueredSection'
import TrailerSection from '../components/TrailerSection'

const Home = () => {
  return (
    <>
      <HeroSection />
      <FeatueredSection />
      {/* Tạm ẩn TrailerSection theo yêu cầu */}
      {/* <TrailerSection /> */}
    </>
  )
}

export default Home