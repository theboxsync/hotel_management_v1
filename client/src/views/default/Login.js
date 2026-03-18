import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import LayoutFullpage from 'layout/LayoutFullpage';
import HtmlHead from 'components/html-head/HtmlHead';
import { useAuth } from 'contexts/AuthContext';
import { toast } from 'react-toastify';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

const Login = () => {
  const title = 'Login';
  const description = 'Login Page';

  const { login } = useAuth();

  const [wrongMsg, setWrongMsg] = useState('');

  const validationSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email format').required('Email is required'),
    password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  });

  const initialValues = {
    email: '',
    password: '',
  };

  const onSubmit = async (values, { setSubmitting }) => {
    setSubmitting(true);
    try {
      const result = await login(values.email, values.password);
      if (result.success) {
        toast.success('Login successful!');
        window.location.href = '/dashboard';
      } else {
        toast.error(result.message);
        setWrongMsg(result.message);
      }
    } catch (error) {
      toast.error('An error occurred during login');
      setWrongMsg('Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formik = useFormik({ initialValues, validationSchema, onSubmit });
  const { handleSubmit, handleChange, values, touched, errors, isSubmitting } = formik;

  // Left Side Content (unchanged)
  const leftSide = (
    <div className="min-h-100 d-flex align-items-center">
      <div className="w-100 w-lg-75 w-xxl-50">
        <div />
      </div>
    </div>
  );

  // Right Side (integrated with login fields)
  const rightSide = (
    <div className="sw-lg-70 min-h-100 bg-foreground d-flex justify-content-center align-items-center shadow-deep py-5 full-page-content-right-border">
      <div className="sw-lg-50 px-5">
        <div className="mb-3">
          <h2 className="cta-1 mb-0 text-primary">Admin Login</h2>
        </div>
        <div className="mb-3">
          <p className="h6">Secure access to your control panel.</p>
        </div>

        <Form
          id="loginForm"
          className="tooltip-end-bottom"
          onSubmit={handleSubmit}
        >
          <div className="mb-3 filled form-group tooltip-end-top">
            <CsLineIcons icon="building" />
            <Form.Control
              type="email"
              name="email"
              className="border"
              placeholder="Email Address"
              value={values.email}
              onChange={handleChange}
            />
            {errors.email && touched.email && <div className="d-block invalid-tooltip">{errors.email}</div>}
          </div>

          {/* Password */}
          <div className="mb-3 filled form-group tooltip-end-top">
            <CsLineIcons icon="lock-off" />
            <Form.Control
              type="password"
              name="password"
              className="border"
              placeholder="Password"
              value={values.password}
              onChange={handleChange}
            />
            {errors.password && touched.password && <div className="d-block invalid-tooltip">{errors.password}</div>}
          </div>

          {/* Submit */}
          <Button size="lg" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </Button>

          {/* Wrong Message */}
          {wrongMsg && (
            <div className="text-danger my-3">
              <b>{wrongMsg}</b>
            </div>
          )}
        </Form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
        <div className="mt-auto text-center pt-4">
          <p className="mb-0 text-muted" style={{ fontSize: '12px' }}>
            Powered by <strong>TheBoxSync</strong>
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <HtmlHead title={title} description={description} />
      <LayoutFullpage left={leftSide} right={rightSide} />
    </>
  );
};

export default Login;