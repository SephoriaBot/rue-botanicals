import { Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import Home from './pages/Home';
import About from './pages/About';
import Products from './pages/Products';
import Contact from './pages/Contact';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import MySkin from './pages/MySkin';
import TesterDashboard from './pages/TesterDashboard';
import TesterLogin from './pages/TesterLogin';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/products" element={<Products />} />
        <Route path="/my-skin" element={<MySkin />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/tester/login" element={<TesterLogin />} />
        <Route path="/tester" element={<TesterDashboard />} />
      </Route>
    </Routes>
  );
}
