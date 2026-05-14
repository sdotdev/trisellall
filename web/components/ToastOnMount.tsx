'use client'

import { useEffect } from 'react'
import { useToast } from './Toast'

export default function ToastOnMount({ message, type = 'success' }: { message: string; type?: 'success' | 'error' }) {
  const { toast } = useToast()

  useEffect(() => {
    toast(message, type)
  }, [message, type, toast])

  return null
}
