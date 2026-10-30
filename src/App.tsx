import { useCallback, useEffect, useRef, useState } from 'react';
import { CartDrawer } from './cart/CartDrawer';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HowWeFarm } from './components/HowWeFarm';
import { Journey } from './components/Journey';
import { ScrollProgress } from './components/ScrollProgress';
import { ShopGrid } from './components/ShopGrid';
import { SoundToggle } from './components/SoundToggle';
import { StaticIntro } from './components/StaticIntro';
import { hideBootLoader } from './lib/bootLoader';
import { useReducedMotion } from './lib/hooks';

export function App() {
  const reducedMotion = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [headerDark, setHeaderDark] = useState(false);
  const shopTitle = useRef<HTMLHeadingElement>(null);
  const immersive = !reducedMotion && !failed;

  // The walk hides the loader once part 1 is ready; the plain layout has nothing to wait for.
  useEffect(() => {
    if (!immersive) hideBootLoader();
  }, [immersive]);

  const goToShop = useCallback(() => {
    document.getElementById('shop')?.scrollIntoView({ behavior: 'auto', block: 'start' });
    shopTitle.current?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <div id="top" />
      <Header onShopAll={goToShop} onDark={immersive && headerDark} />
      <SoundToggle />
      <main>
        {immersive ? <Journey onHeaderDark={setHeaderDark} onFail={() => setFailed(true)} /> : <StaticIntro />}
        <ShopGrid ref={shopTitle} />
        <HowWeFarm />
      </main>
      <Footer />
      <ScrollProgress />
      <CartDrawer />
    </>
  );
}
