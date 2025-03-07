import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, createBrowserRouter, RouterProvider } from "react-router-dom";
import './index.css'
import App from './App.jsx'
import React from 'react';
import { Home } from './components/home/Home.jsx';
import { MyAccount } from './components/myaccounts/MyAccount.jsx';
import { UpdateAccount } from './components/updateAcc/UpdateAccount.jsx';
import { ChangePassword } from './components/updateAcc/ChangePassword.jsx';



const router = createBrowserRouter([
  {path: '/', element: <Home />},
  {path: '/myaccount', element: <MyAccount />},
  {path: "/update-account", element: <UpdateAccount />},
  {path: "/change-password", element: <ChangePassword />},
])

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router}/>
  </React.StrictMode>,
)
