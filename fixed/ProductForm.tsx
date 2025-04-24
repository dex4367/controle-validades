import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { 
  getProduct, 
  createProduct, 
  updateProduct, 
  getCategories, 
  createCategory,
  uploadProductImage,
  getProductsByBarcode
} from '../services/supabase'

const ProductForm = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [existingBarcodeProducts, setExistingBarcodeProducts] = useState<any[]>([])
  const [showExistingProducts, setShowExistingProducts] = useState(false)

  // Estado do produto
  const [product, setProduct] = useState({
    name: '',
    barcode: '',
    category_id: 0,
    expiry_date: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
    image_url: ''
  })

  // Rest of the component code...
} 