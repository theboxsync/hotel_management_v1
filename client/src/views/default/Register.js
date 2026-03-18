import React, { useState } from 'react';
import { useHistory, Link } from 'react-router-dom';
import { Button, Form } from 'react-bootstrap';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { toast } from 'react-toastify';
import { useAuth } from 'contexts/AuthContext';
import LayoutFullpage from 'layout/LayoutFullpage';
import HtmlHead from 'components/html-head/HtmlHead';
import CsLineIcons from 'cs-line-icons/CsLineIcons';

const Register = () => {
  const title = 'Register';
  const description = 'Register Page';

  const [step, setStep] = useState(1); // 1: Register, 2: Verify
  const [otp, setOtp] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const { register, verifyEmail } = useAuth();
  const history = useHistory();

  // Registration Form Validation Schema
  const registerValidationSchema = Yup.object().shape({
    hotel_name: Yup.string().required('Hotel name is required'),
    owner_name: Yup.string().required('Owner name is required'),
    email: Yup.string().email('Invalid email format').required('Email is required'),
    phone: Yup.string().required('Phone number is required'),
    address: Yup.string().required('Hotel address is required'),
    password: Yup.string()
      .min(8, 'Password must be at least 8 characters')
      .required('Password is required'),
    confirm_password: Yup.string()
      .oneOf([Yup.ref('password'), null], 'Passwords must match')
      .required('Confirm password is required'),
  });

  // OTP Verification Validation Schema
  const otpValidationSchema = Yup.object().shape({
    otp: Yup.string()
      .length(6, 'OTP must be 6 digits')
      .matches(/^[0-9]+$/, 'OTP must contain only numbers')
      .required('OTP is required'),
  });

  // Registration Form Initial Values
  const registerInitialValues = {
    hotel_name: '',
    owner_name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirm_password: '',
  };

  // OTP Form Initial Values
  const otpInitialValues = {
    otp: '',
  };

  // Formik instances

  // Registration Form Submission
  const onRegisterSubmit = async (values, { setSubmitting }) => {
    // Validation is handled by Formik/Yup

    setSubmitting(true);
    try {
      const result = await register(values);
      if (result.success) {
        toast.success('Registration successful! Please check your email for OTP');
        setStep(2);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An error occurred during registration');
    } finally {
      setSubmitting(false);
    }
  };

  const registerFormik = useFormik({
    initialValues: registerInitialValues,
    validationSchema: registerValidationSchema,
    onSubmit: onRegisterSubmit,
  });
  // OTP Verification Submission
  const onOtpSubmit = async (values, { setSubmitting }) => {
    setVerifyLoading(true);
    setSubmitting(true);

    try {
      const result = await verifyEmail(registerFormik.values.email, values.otp);
      if (result.success) {
        toast.success('Email verified successfully! Please login');
        history.push('/login');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('An error occurred during verification');
    } finally {
      setVerifyLoading(false);
      setSubmitting(false);
    }
  };

  const otpFormik = useFormik({
    initialValues: otpInitialValues,
    validationSchema: otpValidationSchema,
    onSubmit: onOtpSubmit,
  });

  // Left Side Content (same as Login)
  const leftSide = (
    <div className="min-h-100 d-flex align-items-center">
      <div className="w-100 w-lg-75 w-xxl-50">
        <div />
      </div>
    </div>
  );

  // Registration Form
  const registrationForm = (
    <Form
      id="registerForm"
      className="tooltip-end-bottom"
      onSubmit={registerFormik.handleSubmit}
    >
      {/* Hotel Name */}
      <div className="mb-3 filled form-group tooltip-end-top">
        <CsLineIcons icon="building" />
        <Form.Control
          type="text"
          name="hotel_name"
          placeholder="Hotel Name"
          value={registerFormik.values.hotel_name}
          onChange={registerFormik.handleChange}
          onBlur={registerFormik.handleBlur}
          className="border"
        />
        {registerFormik.errors.hotel_name && registerFormik.touched.hotel_name && (
          <div className="d-block invalid-tooltip">{registerFormik.errors.hotel_name}</div>
        )}
      </div>

      {/* Owner Name */}
      <div className="mb-3 filled form-group tooltip-end-top">
        <CsLineIcons icon="user" />
        <Form.Control
          type="text"
          name="owner_name"
          placeholder="Owner Name"
          value={registerFormik.values.owner_name}
          onChange={registerFormik.handleChange}
          onBlur={registerFormik.handleBlur}
          className="border"
        />
        {registerFormik.errors.owner_name && registerFormik.touched.owner_name && (
          <div className="d-block invalid-tooltip">{registerFormik.errors.owner_name}</div>
        )}
      </div>

      {/* Email */}
      <div className="mb-3 filled form-group tooltip-end-top">
        <CsLineIcons icon="email" />
        <Form.Control
          type="email"
          name="email"
          placeholder="Email Address"
          value={registerFormik.values.email}
          onChange={registerFormik.handleChange}
          onBlur={registerFormik.handleBlur}
          className="border"
        />
        {registerFormik.errors.email && registerFormik.touched.email && (
          <div className="d-block invalid-tooltip">{registerFormik.errors.email}</div>
        )}
      </div>

      {/* Phone */}
      <div className="mb-3 filled form-group tooltip-end-top">
        <CsLineIcons icon="phone" />
        <Form.Control
          type="tel"
          name="phone"
          placeholder="Phone Number"
          value={registerFormik.values.phone}
          onChange={registerFormik.handleChange}
          onBlur={registerFormik.handleBlur}
          className="border"
        />
        {registerFormik.errors.phone && registerFormik.touched.phone && (
          <div className="d-block invalid-tooltip">{registerFormik.errors.phone}</div>
        )}
      </div>

      {/* Address */}
      <div className="mb-3 filled form-group tooltip-end-top">
        <CsLineIcons icon="pin" />
        <Form.Control
          as="textarea"
          rows="3"
          name="address"
          placeholder="Hotel Address"
          value={registerFormik.values.address}
          onChange={registerFormik.handleChange}
          onBlur={registerFormik.handleBlur}
          className="border"
        />
        {registerFormik.errors.address && registerFormik.touched.address && (
          <div className="d-block invalid-tooltip">{registerFormik.errors.address}</div>
        )}
      </div>

      {/* Password */}
      <div className="mb-3 filled form-group tooltip-end-top">
        <CsLineIcons icon="lock-off" />
        <Form.Control
          type="password"
          name="password"
          placeholder="Password (min. 8 characters)"
          value={registerFormik.values.password}
          onChange={registerFormik.handleChange}
          onBlur={registerFormik.handleBlur}
          className="border"
        />
        {registerFormik.errors.password && registerFormik.touched.password && (
          <div className="d-block invalid-tooltip">{registerFormik.errors.password}</div>
        )}
      </div>

      {/* Confirm Password */}
      <div className="mb-3 filled form-group tooltip-end-top">
        <CsLineIcons icon="lock-on" />
        <Form.Control
          type="password"
          name="confirm_password"
          placeholder="Confirm Password"
          value={registerFormik.values.confirm_password}
          onChange={registerFormik.handleChange}
          onBlur={registerFormik.handleBlur}
          className="border"
        />
        {registerFormik.errors.confirm_password && registerFormik.touched.confirm_password && (
          <div className="d-block invalid-tooltip">{registerFormik.errors.confirm_password}</div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        size="lg"
        type="submit"
        disabled={registerFormik.isSubmitting}
        className="mt-2"
      >
        {registerFormik.isSubmitting ? 'Registering...' : 'Register Hotel'}
      </Button>
    </Form>
  );

  // OTP Verification Form
  const otpForm = (
    <Form
      id="otpForm"
      className="tooltip-end-bottom"
      onSubmit={otpFormik.handleSubmit}
    >
      <div className="verification-info mb-4 text-center">
        <p className="mb-2">We've sent a 6-digit OTP to:</p>
        <p className="h5 text-primary mb-2">{registerFormik.values.email}</p>
        <p className="text-muted small">Note: Check your console for OTP (email not configured)</p>
      </div>

      {/* OTP Input */}
      <div className="mb-4 filled form-group tooltip-end-top">
        <CsLineIcons icon="password" />
        <Form.Control
          type="text"
          name="otp"
          placeholder="Enter 6-digit OTP"
          value={otpFormik.values.otp}
          onChange={otpFormik.handleChange}
          onBlur={otpFormik.handleBlur}
          maxLength="6"
          className="border"
        />
        {otpFormik.errors.otp && otpFormik.touched.otp && (
          <div className="d-block invalid-tooltip">{otpFormik.errors.otp}</div>
        )}
      </div>

      {/* Buttons */}
      <div className="d-flex gap-3">
        <Button
          size="lg"
          type="submit"
          disabled={otpFormik.isSubmitting || verifyLoading}
          className="flex-grow-1"
        >
          {otpFormik.isSubmitting || verifyLoading ? 'Verifying...' : 'Verify Email'}
        </Button>

        <Button
          size="lg"
          variant="outline-secondary"
          type="button"
          onClick={() => setStep(1)}
          disabled={otpFormik.isSubmitting || verifyLoading}
        >
          Back
        </Button>
      </div>
    </Form>
  );

  // Right Side
  const rightSide = (
    <div className="sw-lg-70 min-h-100 bg-foreground d-flex justify-content-center align-items-center shadow-deep py-5 full-page-content-right-border">
      <div className="sw-lg-50 px-5">
        <div className="mb-3">
          <h2 className="cta-1 mb-0 text-primary">
            {step === 1 ? 'Hotel Registration' : 'Email Verification'}
          </h2>
        </div>
        <div className="mb-3">
          <p className="h6">
            {step === 1
              ? 'Register your hotel to get started.'
              : 'Please verify your email address to continue.'}
          </p>
        </div>

        {step === 1 ? registrationForm : otpForm}

        <div className="auth-footer mt-4">
          <p>
            Already have an account? <Link to="/login">Login here</Link>
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

export default Register;