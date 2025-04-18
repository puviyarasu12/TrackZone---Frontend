import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles.css';
import Header from '../../components/Header/Header';
import Hero from '../../components/Hero/Hero';
import Features from '../../components/Features/Features';
import HowItWorks from '../../components/HowItWorks/HowItWorks';
import Benefits from '../../components/Benefits/Benefits';
import Footer from '../../components/Footer/Footer';

function HomePage() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login-selector');
  };

  return (
    <div className="app">
      <Header />
      <main>
        <Hero />
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <button
            onClick={handleLoginClick}
            style={{
              padding: '10px 20px',
              fontSize: '1.2rem',
              cursor: 'pointer',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#007bff',
              color: 'white',
            }}
          >
            Login
          </button>
        </div>
        <Features />
        <HowItWorks />
        <Benefits />
      </main>
      <Footer />
    </div>
  );
}

export default HomePage;
