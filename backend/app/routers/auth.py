from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import User, StudentProfile, FacultyProfile, UserRole, AuditLog
from backend.app.schemas import UserRegister, UserLogin, Token, UserOut
from backend.app.security import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(req: UserRegister, db: Session = Depends(get_db)):
    # Check if user email already exists
    existing_user = db.query(User).filter(User.email == req.email.lower()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # If student, check registration number uniqueness
    if req.role == UserRole.STUDENT:
        if not req.registration_number:
            raise HTTPException(status_code=400, detail="Registration number is required for students")
        existing_reg = db.query(StudentProfile).filter(StudentProfile.registration_number == req.registration_number.upper()).first()
        if existing_reg:
            raise HTTPException(status_code=400, detail="Student registration number already registered")

    # If faculty, check employee code
    if req.role == UserRole.FACULTY:
        if not req.employee_code:
            raise HTTPException(status_code=400, detail="Employee code is required for faculty")
        existing_emp = db.query(FacultyProfile).filter(FacultyProfile.employee_code == req.employee_code.upper()).first()
        if existing_emp:
            raise HTTPException(status_code=400, detail="Faculty employee code already registered")

    # Create User
    new_user = User(
        email=req.email.lower(),
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role
    )
    db.add(new_user)
    db.flush()

    identifier = ""
    # Create corresponding profile
    if req.role == UserRole.STUDENT:
        student_prof = StudentProfile(
            user_id=new_user.id,
            registration_number=req.registration_number.upper(),
            department=req.department,
            semester=req.semester or 1
        )
        db.add(student_prof)
        identifier = req.registration_number.upper()
    elif req.role == UserRole.FACULTY:
        faculty_prof = FacultyProfile(
            user_id=new_user.id,
            employee_code=req.employee_code.upper(),
            department=req.department
        )
        db.add(faculty_prof)
        identifier = req.employee_code.upper()

    # Audit log
    audit = AuditLog(
        action="USER_REGISTRATION",
        performed_by_user_id=new_user.id,
        target_entity="USER",
        target_id=str(new_user.id),
        details=f"Registered {req.role.value}: {req.full_name} ({req.email})"
    )
    db.add(audit)
    db.commit()

    token = create_access_token(data={"sub": str(new_user.id), "role": new_user.role.value})
    return Token(
        access_token=token,
        role=new_user.role,
        user_id=new_user.id,
        full_name=new_user.full_name,
        email=new_user.email,
        registration_or_emp_id=identifier
    )

@router.post("/login", response_model=Token)
def login(req: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="User account is deactivated")

    identifier = ""
    if user.role == UserRole.STUDENT and user.student_profile:
        identifier = user.student_profile.registration_number
    elif user.role == UserRole.FACULTY and user.faculty_profile:
        identifier = user.faculty_profile.employee_code

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return Token(
        access_token=token,
        role=user.role,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        registration_or_emp_id=identifier
    )

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
