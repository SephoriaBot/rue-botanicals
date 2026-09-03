import { Link, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/react-router';

const stats = [
  { label: 'Testing day', value: 'Day 1', detail: 'of 28' },
  { label: 'Products', value: '3', detail: 'assigned' },
  { label: 'Check-ins', value: '0', detail: 'completed' },
  { label: 'Photos', value: '0', detail: 'uploaded' },
];

const setupTasks = [
  {
    title: 'Upload your baseline photos',
    description: 'Take your starting photos so you can compare your progress later.',
    to: '/tester/photos',
    action: 'Add photos',
  },
  {
    title: 'Complete your starting questionnaire',
    description: 'A few questions about your skin and your usual routine.',
    to: '/tester/questionnaires',
    action: 'Answer questions',
  },
];

export default function TesterDashboard() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return null;
  }

if (!isSignedIn) {
  return <Navigate to="/login" replace />;
}

  return (
    <main className="tester-page">
      <section className="tester-hero wrap">
        <div className="tester-eyebrow">RUE BOTANICALS · TESTER PORTAL</div>
        <h1>Welcome{user?.firstName ? `, ${user.firstName}` : ''}<br />to your testing journal.</h1>
        <p>
          Thank you for helping us test and improve Rue Botanicals.
          Everything you record here helps us understand how our formulas
          perform in real routines.
        </p>

        <div className="tester-progress">
          <div className="tester-progress-top">
            <span>Testing progress</span>
            <strong>Day 1 of 28</strong>
          </div>
          <div className="tester-progress-track">
            <div className="tester-progress-fill" style={{ width: '4%' }} />
          </div>
        </div>
      </section>

      <section className="tester-primary-cta wrap">
        <div className="tester-primary-cta-text">
          <span className="tester-kicker">TODAY'S ENTRY</span>
          <h2>Log how your skin feels today</h2>
          <p>Takes about a minute. Do this once a day while you're testing.</p>
        </div>
        <Link className="tester-primary-cta-button" to="/tester/log">
          Start today's log
          <span>→</span>
        </Link>
      </section>

      <section className="tester-stats wrap">
        {stats.map((stat) => (
          <div className="tester-stat" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.detail}</small>
          </div>
        ))}
      </section>

      <section className="tester-content wrap">
        <div className="tester-section-heading">
          <div>
            <span className="tester-kicker">GETTING SET UP</span>
            <h2>One-time setup</h2>
          </div>
          <span className="tester-date">Today</span>
        </div>

        <div className="tester-task-list">
          {setupTasks.map((task, index) => (
            <article className="tester-task" key={task.title}>
              <div className="tester-task-number">
                {String(index + 1).padStart(2, '0')}
              </div>

              <div className="tester-task-body">
                <h3>{task.title}</h3>
                <p>{task.description}</p>
              </div>

              <Link className="tester-task-action" to={task.to}>
                {task.action}
                <span>→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="tester-content wrap">
        <div className="tester-section-heading">
          <div>
            <span className="tester-kicker">YOUR PRODUCTS</span>
            <h2>Currently testing</h2>
          </div>
        </div>

        <div className="tester-products">
          <div className="tester-product">
            <div className="tester-product-placeholder">01</div>
            <div>
              <span>Assigned product</span>
              <h3>Product name</h3>
              <p>Use as directed in your testing instructions.</p>
            </div>
          </div>

          <div className="tester-product">
            <div className="tester-product-placeholder">02</div>
            <div>
              <span>Assigned product</span>
              <h3>Product name</h3>
              <p>Use as directed in your testing instructions.</p>
            </div>
          </div>

          <div className="tester-product">
            <div className="tester-product-placeholder">03</div>
            <div>
              <span>Assigned product</span>
              <h3>Product name</h3>
              <p>Use as directed in your testing instructions.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="tester-note wrap">
        <div className="tester-note-mark">✦</div>
        <div>
          <h3>A little reminder</h3>
          <p>
            Please be honest about your experience, even when something
            isn't perfect. Your feedback is most useful when it's genuine.
          </p>
        </div>
      </section>
    </main>
  );
}