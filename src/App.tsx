import Nav from './components/Nav';
import Hero from './components/Hero';
import Vision from './components/Vision';
import Mission from './components/Mission';
import Transformations from './components/Transformations';
import Downloads from './components/Downloads';
import Footer from './components/Footer';

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Vision />
        <Mission />
        <Transformations />
        <Downloads />
      </main>
      <Footer />
    </>
  );
}
