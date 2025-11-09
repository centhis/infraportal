// import { useState } from 'react'
// import './App.css'
// import { Routes, Route, useLocation } from 'react-router-dom'

// import Home from '../components/content/Home'
// import Login from '../components/auth/Login'
// import Navbar from '../components/navigation/Navbar'
// import About from '../components/content/About'
// import UserSettings from '../components/settings/user_settings'
// import ProtectedRoute from '../components/auth/ProtectedRoutes'


import React from "react";
import { AuthProvider } from "./providers/AuthProvider";
import { I18nProvider } from "./providers/I18nProvider";
import AppRoutes from "./routes/AppRoutes"
console.log("App render before AppRoutes");

function App() {
  console.log("App render");

  return (
    <I18nProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </I18nProvider>
  )
}

export default App
