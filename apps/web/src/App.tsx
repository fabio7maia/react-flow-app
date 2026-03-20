import Nav from "./sections/Nav";
import Hero from "./sections/Hero";
import Problems from "./sections/Problems";
import Features from "./sections/Features";
import CodeDemo from "./sections/CodeDemo";
import GetStarted from "./sections/GetStarted";
import Footer from "./sections/Footer";

export default function App() {
  return (
    <div className="app">
      <Nav />
      <main>
        <Hero />
        <Problems />
        <Features />
        <CodeDemo />
        <GetStarted />
      </main>
      <Footer />
    </div>
  );
}
