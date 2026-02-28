from datetime import datetime
from . import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    group_memberships = db.relationship("GroupMember", back_populates="user", lazy="dynamic")
    expenses_paid = db.relationship("Expense", back_populates="paid_by_user", lazy="dynamic")
    expense_splits = db.relationship("ExpenseSplit", back_populates="user", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
        }


class Group(db.Model):
    __tablename__ = "groups"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(300), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    members = db.relationship("GroupMember", back_populates="group", lazy="dynamic")
    expenses = db.relationship("Expense", back_populates="group", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "member_count": self.members.count(),
            "expense_count": self.expenses.count(),
        }


class GroupMember(db.Model):
    __tablename__ = "group_members"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("groups.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("group_id", "user_id", name="unique_group_member"),)

    group = db.relationship("Group", back_populates="members")
    user = db.relationship("User", back_populates="group_memberships")

    def to_dict(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "user_id": self.user_id,
            "user_name": self.user.name,
            "user_email": self.user.email,
            "joined_at": self.joined_at.isoformat(),
        }


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("groups.id"), nullable=False)
    paid_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    date = db.Column(db.Date, default=datetime.utcnow().date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    group = db.relationship("Group", back_populates="expenses")
    paid_by_user = db.relationship("User", back_populates="expenses_paid")
    splits = db.relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "paid_by": self.paid_by,
            "paid_by_name": self.paid_by_user.name,
            "description": self.description,
            "amount": float(self.amount),
            "date": self.date.isoformat(),
            "created_at": self.created_at.isoformat(),
            "splits": [split.to_dict() for split in self.splits],
        }


class ExpenseSplit(db.Model):
    __tablename__ = "expense_splits"

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expenses.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    amount_owed = db.Column(db.Numeric(10, 2), nullable=False)
    is_settled = db.Column(db.Boolean, default=False)
    settled_at = db.Column(db.DateTime, nullable=True)

    expense = db.relationship("Expense", back_populates="splits")
    user = db.relationship("User", back_populates="expense_splits")

    def to_dict(self):
        return {
            "id": self.id,
            "expense_id": self.expense_id,
            "user_id": self.user_id,
            "user_name": self.user.name,
            "amount_owed": float(self.amount_owed),
            "is_settled": self.is_settled,
            "settled_at": self.settled_at.isoformat() if self.settled_at else None,
        }