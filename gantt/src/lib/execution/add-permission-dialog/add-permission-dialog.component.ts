import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Validators, FormControl, FormGroup } from '@angular/forms';
import { TypeCodeEnum } from '../../@model/type-code.enum';
import { DATE_PATTERN } from 'projects/mon-impianti/src/app/@effects/entities/mappers/mapper.commons';
import { stringifyDate } from '../../@model/gantt-item.mapper';
import * as moment from 'moment';
interface Permission{
  protocolNumber?: string;
  protocolDate?: any;
  grantTypeCode: string;
  grantDescription: string;
}

export interface PermissionDialogData {
  existingPermissions: any[];
}

@Component({
  selector: 'lib-add-permission-dialog',
  templateUrl: './add-permission-dialog.component.html',
  styleUrls: ['./add-permission-dialog.component.scss'],
})
export class AddPermissionComponent implements OnInit {
  constructor(
    private dialogRef: MatDialogRef<AddPermissionComponent>,
    @Inject(MAT_DIALOG_DATA) private data: PermissionDialogData
    ) {}

  formGroup: FormGroup;
  newPermissions: Permission[] = [];
  existingPermissions: Permission[] = [];
  alreadyCreated: boolean = false;
  
  entiPubbliciType: string = "PEP";
  entiTerritorialiType: string = "PET";
  autorizzazioneType: string = "PAE";

  entiPubblici: string = "Enti pubblici";
  entiTerritoriali: string = "Enti territoriali";
  autorizzazione: string = "Autorizzazione all\'esercizio"

  getMessage = (): string =>
    `Inserimento specifici permessi pubblici`;

  onCreate(): void {
    this.dialogRef.close({add: true, permissions: this.newPermissions});
  }

  onDismiss(): void {
    this.dialogRef.close({add: false, permissions: []});
  }

  ngOnInit(): void {
    this.initForm();
    this.newPermissions = [];
    this.alreadyCreated = false;
    this.convertExistingPermissions();
  }

  initForm(){
    this.formGroup = new FormGroup({
      protocolNumber: new FormControl(null),
      protocolDate: new FormControl(),
      grantTypeCode: new FormControl(this.entiPubbliciType, Validators.required),
      grantDescription: new FormControl('', Validators.required)
    });
  }

  convertExistingPermissions(){
    this.existingPermissions = this.data.existingPermissions.map((permesso) => {
      return { grantDescription: permesso.name, grantTypeCode: this.convertTypeCode(permesso.typeCode)}
    })
  }

  addPermission(){
    this.alreadyCreated = false;
    const concatAllPermissions = this.newPermissions.concat(this.existingPermissions);    
    const equalPermission = concatAllPermissions.filter(element => 
      element.grantDescription.toLowerCase().trim() == this.formGroup.controls.grantDescription.value.toLowerCase().trim()
      &&
      element.grantTypeCode == this.formGroup.controls.grantTypeCode.value
      );    
    if(equalPermission.length > 0){
      this.alreadyCreated = true;
    }else{
      let addPermission: Permission = {
        grantDescription: this.formGroup.controls.grantDescription.value,
        grantTypeCode: this.formGroup.controls.grantTypeCode.value
      };

      if(this.formGroup.controls.protocolNumber.value != null && this.formGroup.controls.protocolNumber.value.trim().length !== 0)
        addPermission.protocolNumber = this.formGroup.controls.protocolNumber.value;

      if(this.formGroup.controls.protocolDate.value != null)
        addPermission.protocolDate = stringifyDate(this.formGroup.controls.protocolDate.value);

      this.newPermissions.push(addPermission);
      
      this.initForm();
      this.alreadyCreated = false;
    }    
  }

  mapTipologia(tipo: string){
    let ret = '';
    switch(tipo){
      case this.entiPubbliciType:
        ret = this.entiPubblici;
        break;
      case this.entiTerritorialiType:
        ret = this.entiTerritoriali;
        break;
      case this.autorizzazioneType:
        ret = this.autorizzazione;
        break;
    }
    return ret;
  }

    convertTypeCode(typeCode: string){
    let ret = '';
    switch(typeCode){
      case TypeCodeEnum.PUB_MAIN_AUTH:
        ret = this.entiPubbliciType;
        break;
      case TypeCodeEnum.PUB_SEC_AUTH:
        ret = this.entiTerritorialiType;
        break;
      case TypeCodeEnum.PUB_ES_AUTH:
        ret = this.autorizzazioneType;
        break;
    }
    return ret;
  }

  getPermissionString(permesso: Permission){
    let ret = '';
    if(permesso.protocolNumber)
      ret += permesso.protocolNumber;
    if(permesso.protocolNumber && permesso.protocolDate)
      ret+= " del ";
    if(permesso.protocolDate)
      ret += moment(permesso.protocolDate, 'YYYY-MM-DD').format(DATE_PATTERN);
    if(permesso.protocolNumber || permesso.protocolDate)
      ret += " - ";

    ret += permesso.grantDescription + " - " + this.mapTipologia(permesso.grantTypeCode);

    return ret;
  }

  removePermission(permission: Permission){
    const index = this.newPermissions.indexOf(permission);
    if (index > -1)
      this.newPermissions.splice(index, 1);
  }
}
