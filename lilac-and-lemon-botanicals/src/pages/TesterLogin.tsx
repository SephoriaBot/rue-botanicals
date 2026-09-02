import { SignIn } from '@clerk/react-router';

export default function TesterLogin() {
  return (
    <div className="tester-login-page">
      <SignIn
        routing="path"
        path="/tester/login"
        fallbackRedirectUrl="/tester"
      />
    </div>
  );
}